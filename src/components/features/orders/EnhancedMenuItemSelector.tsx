// src/components/features/orders/EnhancedMenuItemSelector.tsx
"use client";
import { useState, useMemo } from "react";
import {
  MenuItemWithVariants,
  MenuItemVariant,
  Topping,
  Modifier,
  ConfiguredCartItem,
  ConfiguredTopping,
  ToppingAmount,
} from "@/lib/types";
import FullScreenPizzaCustomizer from "./FullScreenPizzaCustomizer";

/**
 * Enhanced Menu Item Selector with Full-Screen Customizer Integration
 *
 * This component represents the evolution of your menu selection system.
 * It implements a sophisticated routing strategy where different types of
 * menu items are handled by different workflows:
 *
 * SIMPLE ITEMS: Beverages, simple appetizers → Direct to cart
 * VARIANT ITEMS: Items with size options but no customization → Size selection then cart
 * CUSTOMIZABLE ITEMS: Pizzas, complex items → Full-screen customizer experience
 *
 * This approach eliminates the friction of forcing every item through the same
 * workflow, while providing rich customization for items that need it.
 *
 * Key Educational Concepts:
 * - Strategy Pattern: Different item types get different handling strategies
 * - State Management: Managing multiple UI states cleanly
 * - Component Composition: Combining simple components into complex workflows
 * - Progressive Enhancement: Simple items stay simple, complex items get rich features
 */

interface EnhancedMenuItemSelectorProps {
  menuItems: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
  onAddToCart: (configuredItem: ConfiguredCartItem) => void;
}

export default function EnhancedMenuItemSelector({
  menuItems,
  toppings, // Now we're actually using these props!
  modifiers, // These get passed to the customizer
  onAddToCart,
}: EnhancedMenuItemSelectorProps) {
  // ==========================================
  // STATE MANAGEMENT FOR MULTIPLE UI MODES
  // ==========================================

  /**
   * We manage several different UI states here:
   * 1. Menu browsing (default state)
   * 2. Size selection for multi-variant items
   * 3. Full-screen customization for complex items
   *
   * This state management pattern is called "finite state machine" thinking -
   * the component can be in exactly one state at a time, and the transitions
   * between states are clearly defined.
   */

  const [selectedItem, setSelectedItem] = useState<MenuItemWithVariants | null>(
    null
  );
  const [selectedVariant, setSelectedVariant] =
    useState<MenuItemVariant | null>(null);

  // NEW: State for managing the full-screen customizer
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customizerItem, setCustomizerItem] =
    useState<ConfiguredCartItem | null>(null);

  // ==========================================
  // MENU ORGANIZATION AND DISPLAY LOGIC
  // ==========================================

  /**
   * Group menu items by category for intuitive browsing.
   * This makes the interface more navigable and matches how customers
   * think about restaurant menus (appetizers, entrees, desserts, etc.)
   */
  const itemsByCategory = useMemo(() => {
    const grouped = menuItems.reduce((acc, item) => {
      const categoryName = item.category?.name || "Other";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    }, {} as Record<string, MenuItemWithVariants[]>);

    return grouped;
  }, [menuItems]);

  // ==========================================
  // ITEM SELECTION STRATEGY IMPLEMENTATION
  // ==========================================

  /**
   * This is the heart of our routing logic. When a staff member selects
   * an item, we need to intelligently decide what should happen next.
   *
   * The decision tree looks like this:
   * 1. Is it customizable OR has multiple sizes? → Full-screen customizer
   * 2. Has exactly one size variant? → Add directly with that size
   * 3. No variants at all? → Add as basic item
   *
   * This ensures that simple items (like beverages) don't get forced through
   * unnecessary complexity, while complex items get the rich experience they need.
   */
  const handleItemSelect = (item: MenuItemWithVariants) => {
    setSelectedItem(item);

    // STRATEGY 1: Complex items get the full customization experience
    if (
      item.allows_custom_toppings ||
      (item.variants && item.variants.length > 1)
    ) {
      openFullScreenCustomizer(item);
    }
    // STRATEGY 2: Single variant items go straight to cart
    else if (item.variants && item.variants.length === 1) {
      addBasicItemToCart(item, item.variants[0]);
    }
    // STRATEGY 3: No variants, add as basic item
    else {
      addBasicItemToCart(item);
    }
  };

  /**
   * THE MISSING PIECE: Opening the full-screen customizer
   *
   * This function creates the bridge between item selection and customization.
   * It prepares a basic cart item with defaults, then opens the customizer
   * where the customer can modify everything.
   *
   * Educational concept: This is "progressive enhancement" - we start with
   * a working basic configuration, then allow enhancement through customization.
   */
  const openFullScreenCustomizer = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ) => {
    // Create a basic cart item to pass to the customizer
    // This ensures the customizer always has a valid starting point
    const cartItem: ConfiguredCartItem = {
      id: generateCartItemId(),
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: variant?.id,
      variantName: variant?.name,
      quantity: 1,
      basePrice: variant?.price || item.base_price,
      selectedToppings: getDefaultToppings(item),
      selectedModifiers: [],
      totalPrice: variant?.price || item.base_price,
      displayName: createDisplayName(item, variant),
      specialInstructions: "",
    };

    // Set up the customizer state
    setCustomizerItem(cartItem);
    setShowCustomizer(true);
  };

  /**
   * Handle customizer completion
   *
   * When the customizer finishes (either save or quick-add), we clean up
   * the state and pass the configured item to the parent component.
   * This maintains the clean separation between selection and customization.
   */
  const handleCustomizerComplete = (configuredItem: ConfiguredCartItem) => {
    onAddToCart(configuredItem);
    // Clean up customizer state
    setShowCustomizer(false);
    setCustomizerItem(null);
    setSelectedItem(null);
  };

  /**
   * Handle customizer cancellation
   *
   * If the user cancels customization, we return to the menu selection state.
   * This provides a clear escape path from the customizer back to browsing.
   */
  const handleCustomizerCancel = () => {
    setShowCustomizer(false);
    setCustomizerItem(null);
    setSelectedItem(null);
  };

  // ==========================================
  // VARIANT SELECTION HANDLING
  // ==========================================

  /**
   * Handle variant selection for items that have multiple sizes but
   * don't need full customization (like different sized sodas).
   *
   * This preserves the existing variant selection workflow for items
   * that don't benefit from the full-screen experience.
   */
  const handleVariantSelect = (variant: MenuItemVariant) => {
    if (!selectedItem) return;

    setSelectedVariant(variant);
    addBasicItemToCart(selectedItem, variant);
  };

  // ==========================================
  // CART ITEM CREATION LOGIC
  // ==========================================

  /**
   * Create a basic cart item for simple items or as a starting point
   * for customization. This function encapsulates the business logic
   * of how menu items transform into cart items.
   */
  const addBasicItemToCart = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ) => {
    const cartItem: ConfiguredCartItem = {
      id: generateCartItemId(),
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: variant?.id,
      variantName: variant?.name,
      quantity: 1,
      basePrice: variant?.price || item.base_price,
      selectedToppings: getDefaultToppings(item),
      selectedModifiers: [],
      totalPrice: variant?.price || item.base_price,
      displayName: createDisplayName(item, variant),
      specialInstructions: "",
    };

    onAddToCart(cartItem);
    setSelectedItem(null);
    setSelectedVariant(null);
  };

  /**
   * Extract default toppings for specialty pizzas from the database configuration.
   *
   * This function demonstrates how to safely parse JSON data from your database
   * while handling edge cases gracefully. The business logic here ensures that
   * specialty pizzas (like Margherita) come with their signature ingredients.
   */
  const getDefaultToppings = (
    item: MenuItemWithVariants
  ): ConfiguredTopping[] => {
    const defaultToppings: ConfiguredTopping[] = [];

    if (item.default_toppings_json && item.item_type === "pizza") {
      try {
        const config = item.default_toppings_json as {
          toppings: Array<{
            id: string;
            name: string;
            amount?: ToppingAmount;
          }>;
        };

        if (config && config.toppings && Array.isArray(config.toppings)) {
          config.toppings.forEach((topping) => {
            defaultToppings.push({
              id: topping.id,
              name: topping.name,
              amount: topping.amount || "normal",
              price: 0, // Default toppings are included in base price
              isDefault: true,
              category: "default",
            });
          });
        }
      } catch (error) {
        console.error("Error parsing default toppings:", error);
        // Graceful degradation - if parsing fails, we continue without defaults
      }
    }

    // Business rule: All pizzas should have cheese unless explicitly configured otherwise
    if (
      item.item_type === "pizza" &&
      !defaultToppings.some((t) => t.name.toLowerCase().includes("cheese"))
    ) {
      defaultToppings.push({
        id: "cheese",
        name: "Cheese",
        amount: "normal",
        price: 0,
        isDefault: true,
        category: "cheese",
      });
    }

    return defaultToppings;
  };

  /**
   * Create human-readable display names for cart items.
   * This ensures that staff and customers can easily identify items
   * in the cart and on orders.
   */
  const createDisplayName = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ): string => {
    if (variant) {
      return `${variant.name} ${item.name}`;
    }
    return item.name;
  };

  /**
   * Generate unique identifiers for cart items.
   * This ensures that even identical items can be tracked separately
   * in the cart (important for modifications and order tracking).
   */
  const generateCartItemId = (): string => {
    return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // ==========================================
  // RENDER LOGIC WITH CONDITIONAL DISPLAY
  // ==========================================

  /**
   * CRITICAL: Conditional rendering for the full-screen customizer
   *
   * When the customizer is active, it takes over the entire interface.
   * This creates an immersive experience that eliminates distractions
   * and focuses entirely on building the perfect order.
   *
   * Educational concept: This is called "modal interaction" - the user
   * can only interact with the customizer until they complete or cancel it.
   */
  if (showCustomizer && customizerItem && selectedItem) {
    return (
      <FullScreenPizzaCustomizer
        item={customizerItem}
        menuItemWithVariants={selectedItem}
        availableToppings={toppings}
        availableModifiers={modifiers}
        onComplete={handleCustomizerComplete}
        onCancel={handleCustomizerCancel}
        isEditMode={false} // This is a new item, not editing an existing one
      />
    );
  }

  /**
   * DEFAULT RENDER: Menu selection interface
   *
   * When not customizing, we show either the main menu or variant selection.
   * This maintains the familiar browsing experience while providing access
   * to the advanced customization features when needed.
   */
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {selectedItem && !selectedVariant
          ? `Select Size for ${selectedItem.name}`
          : "Select Menu Item"}
      </h3>

      {selectedItem && selectedItem.variants.length > 0 && !selectedVariant ? (
        <VariantSelector
          item={selectedItem}
          onVariantSelect={handleVariantSelect}
          onBack={() => setSelectedItem(null)}
        />
      ) : (
        <MenuItemGrid
          itemsByCategory={itemsByCategory}
          onItemSelect={handleItemSelect}
        />
      )}
    </div>
  );
}

// ==========================================
// VARIANT SELECTOR COMPONENT
// ==========================================

/**
 * Specialized component for selecting item variants (sizes, portions, etc.)
 *
 * This component handles the intermediate step for items that have multiple
 * sizes but don't need full customization. It provides a clean, focused
 * interface for size selection with clear pricing information.
 */
interface VariantSelectorProps {
  item: MenuItemWithVariants;
  onVariantSelect: (variant: MenuItemVariant) => void;
  onBack: () => void;
}

function VariantSelector({
  item,
  onVariantSelect,
  onBack,
}: VariantSelectorProps) {
  /**
   * Sort variants by size in logical order.
   *
   * This ensures that sizes appear in the order customers expect
   * (Small → Medium → Large → Extra Large) rather than random
   * database order.
   */
  const orderedVariants = useMemo(() => {
    const sizeOrder = {
      Small: 1,
      Medium: 2,
      Large: 3,
      "Extra Large": 4,
    };

    return [...item.variants].sort((a, b) => {
      const aSize =
        Object.keys(sizeOrder).find((size) =>
          a.name.toLowerCase().includes(size.toLowerCase())
        ) || "";

      const bSize =
        Object.keys(sizeOrder).find((size) =>
          b.name.toLowerCase().includes(size.toLowerCase())
        ) || "";

      const aOrder = sizeOrder[aSize as keyof typeof sizeOrder] || 999;
      const bOrder = sizeOrder[bSize as keyof typeof sizeOrder] || 999;

      return aOrder - bOrder;
    });
  }, [item.variants]);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        ← Back to Menu
      </button>

      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          Choose Size for {item.name}
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {orderedVariants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => onVariantSelect(variant)}
              className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="font-semibold text-gray-900">{variant.name}</div>
              <div className="text-sm text-gray-600">
                {variant.serves && `${variant.serves} • `}
                {variant.crust_type && `${variant.crust_type} crust`}
              </div>
              <div className="text-lg font-bold text-green-600 mt-2">
                ${variant.price.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU ITEM GRID COMPONENT
// ==========================================

/**
 * Main menu browsing interface with search and category organization.
 *
 * This component provides the familiar menu browsing experience that
 * staff expect, with enhancements like search and clear visual indicators
 * for different types of items.
 */
interface MenuItemGridProps {
  itemsByCategory: Record<string, MenuItemWithVariants[]>;
  onItemSelect: (item: MenuItemWithVariants) => void;
}

function MenuItemGrid({ itemsByCategory, onItemSelect }: MenuItemGridProps) {
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * Real-time search filtering across all menu items.
   *
   * This helps staff quickly find specific items during busy periods
   * without having to scroll through entire categories.
   */
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return itemsByCategory;

    const filtered: Record<string, MenuItemWithVariants[]> = {};

    Object.entries(itemsByCategory).forEach(([category, items]) => {
      const matchingItems = items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchingItems.length > 0) {
        filtered[category] = matchingItems;
      }
    });

    return filtered;
  }, [itemsByCategory, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Search functionality for quick item location */}
      <div>
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Category-organized menu display */}
      <div className="space-y-6 max-h-[500px] overflow-y-auto">
        {Object.entries(filteredCategories).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-md font-semibold text-gray-900 mb-3 sticky top-0 bg-gray-50 py-1">
              {category}
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onSelect={() => onItemSelect(item)}
                />
              ))}
            </div>
          </div>
        ))}

        {Object.keys(filteredCategories).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items found matching &quot;{searchTerm}&quot;
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MENU ITEM CARD COMPONENT
// ==========================================

/**
 * Individual menu item display with smart pricing and capability indicators.
 *
 * This component shows each menu item with appropriate visual cues about
 * what will happen when selected (size selection, customization, direct add).
 */
interface MenuItemCardProps {
  item: MenuItemWithVariants;
  onSelect: () => void;
}

function MenuItemCard({ item, onSelect }: MenuItemCardProps) {
  const hasVariants = item.variants && item.variants.length > 0;
  const allowsCustomization = item.allows_custom_toppings;

  /**
   * Smart pricing display that adapts to the item type.
   *
   * Single price for fixed items, price range for variants.
   * This gives staff immediate pricing context for customer questions.
   */
  const getPriceDisplay = () => {
    if (hasVariants) {
      const prices = item.variants.map((v) => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) {
        return `$${minPrice.toFixed(2)}`;
      } else {
        return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
      }
    } else {
      return `$${item.base_price.toFixed(2)}`;
    }
  };

  return (
    <button
      onClick={onSelect}
      className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all w-full"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900 mb-1">{item.name}</h5>

          {item.description && (
            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
          )}

          {/* Visual indicators for item capabilities */}
          <div className="flex items-center gap-2 text-xs">
            {hasVariants && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Multiple Sizes
              </span>
            )}

            {allowsCustomization && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Customizable
              </span>
            )}

            <span className="text-gray-500">~{item.prep_time_minutes} min</span>
          </div>
        </div>

        <div className="text-right ml-4">
          <div className="text-lg font-bold text-green-600">
            {getPriceDisplay()}
          </div>
          {hasVariants && (
            <div className="text-xs text-gray-500">Choose size</div>
          )}
        </div>
      </div>
    </button>
  );
}

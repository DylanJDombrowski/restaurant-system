// src/components/features/orders/SmartMenuItemSelector.tsx
"use client";
import { useState, useMemo, useCallback } from "react";
import {
  MenuItemWithVariants,
  MenuItemVariant,
  Topping,
  Modifier,
  ConfiguredCartItem,
  ConfiguredTopping,
  ToppingAmount,
} from "@/lib/types";
import ModalPizzaCustomizer from "./ModalPizzaCustomizer";

/**
 * 🎯 TYPE-AWARE Smart Menu Item Selector
 *
 * Handles all item types from your database:
 * - pizza: Full customization (size, crust, toppings, modifiers)
 * - standard: Simple items, may have variants or be direct-add
 * - variants: Items with size/portion options
 * - beverage: Drinks, usually direct-add
 * - stuffed: Special pizza type with different workflow
 */

// Define all possible item types from your database
type ItemType = "pizza" | "standard" | "variants" | "beverage" | "stuffed";

// Define customization strategies
type CustomizationStrategy =
  | "full_pizza" // Pizza with full customization
  | "stuffed_pizza" // Stuffed pizza (special handling)
  | "variant_selection" // Items with size/portion selection
  | "direct_add" // Simple items, add directly to cart
  | "simple_quantity"; // Basic items that might need quantity adjustment

interface SmartMenuItemSelectorProps {
  menuItems: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
  onAddToCart: (configuredItem: ConfiguredCartItem) => void;
}

export default function SmartMenuItemSelector({ menuItems, toppings, modifiers, onAddToCart }: SmartMenuItemSelectorProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [selectedItem, setSelectedItem] = useState<MenuItemWithVariants | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [customizerItem, setCustomizerItem] = useState<ConfiguredCartItem | null>(null);

  // ==========================================
  // TYPE-AWARE BUSINESS LOGIC
  // ==========================================

  /**
   * Determines the customization strategy based on item properties
   */
  const getCustomizationStrategy = useCallback((item: MenuItemWithVariants): CustomizationStrategy => {
    const itemType = item.item_type as ItemType;
    const hasVariants = item.variants && item.variants.length > 0;
    const allowsCustomToppings = item.allows_custom_toppings === true;

    // Pizza items always get full customization
    if (itemType === "pizza") {
      return "full_pizza";
    }

    // Stuffed pizza items (special category)
    if (itemType === "stuffed") {
      return "stuffed_pizza";
    }

    // Items explicitly marked as "variants" or have multiple variants
    if (itemType === "variants" || (hasVariants && item.variants!.length > 1)) {
      return "variant_selection";
    }

    // Beverages are typically direct-add
    if (itemType === "beverage") {
      return "direct_add";
    }

    // Standard items with customization enabled
    if (itemType === "standard" && allowsCustomToppings) {
      // Special case: condiments and sides shouldn't get pizza customization
      if (isCondimentOrSide(item)) {
        return "direct_add";
      }
      // Other standard items with customization (sandwiches, etc.)
      return hasVariants ? "variant_selection" : "simple_quantity";
    }

    // Default: simple direct add
    return "direct_add";
  }, []);

  /**
   * Identifies condiments and side items that shouldn't have customization
   */
  const isCondimentOrSide = useCallback(
    (item: MenuItemWithVariants): boolean => {
      const name = item.name.toLowerCase();
      const category = item.category?.name?.toLowerCase() || "";

      // Known condiments and sides
      const condimentKeywords = [
        "sauce",
        "dressing",
        "giardiniera",
        "peppers",
        "gravy",
        "anchovies",
        "tartar",
        "cocktail",
        "hot sauce",
        "ranch",
      ];

      const sideCategories = ["sides"];

      return (
        condimentKeywords.some((keyword) => name.includes(keyword)) ||
        sideCategories.some((cat) => category.includes(cat)) ||
        item.base_price < 3.0
      ); // Low-price items are likely condiments
    },
    [menuItems]
  );

  // ==========================================
  // SMART CATEGORIZATION
  // ==========================================
  const categorizedItems = useMemo(() => {
    const categories = menuItems.reduce(
      (acc, item) => {
        const categoryName = item.category?.name || "Other";
        if (!acc[categoryName]) {
          acc[categoryName] = {
            pizzas: [],
            stuffedPizzas: [],
            customizable: [],
            variants: [],
            beverages: [],
            sides: [],
            other: [],
          };
        }

        const strategy = getCustomizationStrategy(item);

        switch (strategy) {
          case "full_pizza":
            acc[categoryName].pizzas.push(item);
            break;
          case "stuffed_pizza":
            acc[categoryName].stuffedPizzas.push(item);
            break;
          case "variant_selection":
            acc[categoryName].variants.push(item);
            break;
          case "simple_quantity":
            acc[categoryName].customizable.push(item);
            break;
          case "direct_add":
            if (item.item_type === "beverage") {
              acc[categoryName].beverages.push(item);
            } else if (isCondimentOrSide(item)) {
              acc[categoryName].sides.push(item);
            } else {
              acc[categoryName].other.push(item);
            }
            break;
          default:
            acc[categoryName].other.push(item);
        }

        return acc;
      },
      {} as Record<
        string,
        {
          pizzas: MenuItemWithVariants[];
          stuffedPizzas: MenuItemWithVariants[];
          customizable: MenuItemWithVariants[];
          variants: MenuItemWithVariants[];
          beverages: MenuItemWithVariants[];
          sides: MenuItemWithVariants[];
          other: MenuItemWithVariants[];
        }
      >
    );

    return categories;
  }, [menuItems, getCustomizationStrategy, isCondimentOrSide]);

  // ==========================================
  // SMART ITEM SELECTION LOGIC
  // ==========================================
  const handleItemSelect = (item: MenuItemWithVariants) => {
    const strategy = getCustomizationStrategy(item);
    console.log(`🎯 Item: ${item.name} | Type: ${item.item_type} | Strategy: ${strategy}`);

    setSelectedItem(item);

    switch (strategy) {
      case "full_pizza":
        console.log("→ Opening full pizza customizer");
        openPizzaCustomizer(item);
        break;

      case "stuffed_pizza":
        console.log("→ Opening stuffed pizza customizer");
        openPizzaCustomizer(item); // Same modal, different base item
        break;

      case "variant_selection":
        console.log("→ Showing variant selection");
        if (item.variants && item.variants.length === 1) {
          // Skip selection if only one variant
          handleVariantSelect(item.variants[0]);
        }
        // Otherwise handled by render logic
        break;

      case "simple_quantity":
        console.log("→ Simple item with possible customization");
        // Could open a simplified customizer or add directly
        addDirectToCart(item);
        break;

      case "direct_add":
        console.log("→ Adding directly to cart");
        addDirectToCart(item);
        break;

      default:
        console.warn("Unknown strategy:", strategy);
        addDirectToCart(item);
    }
  };

  // ==========================================
  // PIZZA CUSTOMIZER LOGIC
  // ==========================================
  const openPizzaCustomizer = (item: MenuItemWithVariants, variant?: MenuItemVariant) => {
    const cartItem = createCartItem(item, variant);
    setCustomizerItem(cartItem);
    setShowCustomizerModal(true);
  };

  const handleCustomizerComplete = (updatedItem: ConfiguredCartItem) => {
    console.log("✅ Pizza customization completed");
    onAddToCart(updatedItem);
    closeCustomizer();
  };

  const handleCustomizerCancel = () => {
    console.log("❌ Pizza customization cancelled");
    closeCustomizer();
  };

  const closeCustomizer = () => {
    setShowCustomizerModal(false);
    setCustomizerItem(null);
    setSelectedItem(null);
    setSelectedVariant(null);
  };

  // ==========================================
  // VARIANT SELECTION LOGIC
  // ==========================================
  const handleVariantSelect = (variant: MenuItemVariant) => {
    if (!selectedItem) return;

    console.log(`📏 Variant selected: ${variant.name} for ${selectedItem.name}`);
    setSelectedVariant(variant);

    const strategy = getCustomizationStrategy(selectedItem);

    // After variant selection, check if we need further customization
    if (strategy === "full_pizza" || strategy === "stuffed_pizza") {
      openPizzaCustomizer(selectedItem, variant);
    } else {
      addDirectToCart(selectedItem, variant);
    }
  };

  // ==========================================
  // DIRECT CART ADDITION
  // ==========================================
  const addDirectToCart = (item: MenuItemWithVariants, variant?: MenuItemVariant) => {
    try {
      const cartItem = createCartItem(item, variant);
      console.log(`➕ Adding to cart: ${cartItem.displayName} - $${cartItem.totalPrice}`);
      onAddToCart(cartItem);

      // Clear selection
      setSelectedItem(null);
      setSelectedVariant(null);
    } catch (error) {
      console.error("Error adding item to cart:", error);
      alert("Error adding item to cart. Please try again.");
    }
  };

  // ==========================================
  // CART ITEM CREATION
  // ==========================================
  const createCartItem = (item: MenuItemWithVariants, variant?: MenuItemVariant): ConfiguredCartItem => {
    const basePrice = variant?.price ?? item.base_price;
    const displayName = variant?.name ? `${variant.name} ${item.name}` : item.name;

    // Get default toppings for pizza items only
    const defaultToppings = item.item_type === "pizza" || item.item_type === "stuffed" ? getDefaultToppings(item) : [];

    return {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: variant?.id,
      variantName: variant?.name,
      quantity: 1,
      basePrice,
      selectedToppings: defaultToppings,
      selectedModifiers: [],
      specialInstructions: "",
      totalPrice: basePrice,
      displayName,
    };
  };

  const getDefaultToppings = (item: MenuItemWithVariants): ConfiguredTopping[] => {
    const defaultToppings: ConfiguredTopping[] = [];

    try {
      if (item.default_toppings_json && typeof item.default_toppings_json === "object") {
        const config = item.default_toppings_json as {
          toppings?: Array<{
            id: string;
            name: string;
            amount?: string;
          }>;
        };
        if (config.toppings && Array.isArray(config.toppings)) {
          config.toppings.forEach((topping) => {
            if (topping.id && topping.name) {
              defaultToppings.push({
                id: topping.id,
                name: topping.name,
                amount: (topping.amount as ToppingAmount) || "normal",
                price: 0,
                isDefault: true,
                category: "default",
              });
            }
          });
        }
      }
    } catch (error) {
      console.error("Error parsing default toppings:", error);
    }

    return defaultToppings;
  };

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  const needsVariantSelection = (item: MenuItemWithVariants): boolean => {
    const strategy = getCustomizationStrategy(item);
    return strategy === "variant_selection" && item.variants && item.variants.length > 1;
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {selectedItem && needsVariantSelection(selectedItem) && !selectedVariant && !showCustomizerModal
          ? `Select Size for ${selectedItem.name}`
          : "Select Menu Item"}
      </h3>

      {/* Show variant selector if needed */}
      {selectedItem && needsVariantSelection(selectedItem) && !selectedVariant && !showCustomizerModal ? (
        <VariantSelector item={selectedItem} onVariantSelect={handleVariantSelect} onBack={() => setSelectedItem(null)} />
      ) : !showCustomizerModal ? (
        <CategoryGrid
          categorizedItems={categorizedItems}
          onItemSelect={handleItemSelect}
          getCustomizationStrategy={getCustomizationStrategy}
        />
      ) : null}

      {/* Pizza Customizer Modal */}
      {showCustomizerModal && customizerItem && (
        <ModalPizzaCustomizer
          item={customizerItem}
          menuItemWithVariants={selectedItem || undefined}
          availableToppings={toppings}
          availableModifiers={modifiers}
          onComplete={handleCustomizerComplete}
          onCancel={handleCustomizerCancel}
          isOpen={showCustomizerModal}
        />
      )}
    </div>
  );
}

// ==========================================
// VARIANT SELECTOR COMPONENT (Enhanced)
// ==========================================
interface VariantSelectorProps {
  item: MenuItemWithVariants;
  onVariantSelect: (variant: MenuItemVariant) => void;
  onBack: () => void;
}

function VariantSelector({ item, onVariantSelect, onBack }: VariantSelectorProps) {
  // Clean and organize variants
  const organizedVariants = useMemo(() => {
    if (!item.variants) return [];

    // Remove duplicates and organize by size
    const uniqueVariants = new Map<string, MenuItemVariant>();

    item.variants.forEach((variant) => {
      const key = `${variant.size_code}-${variant.crust_type || "default"}`;

      // Prefer variants with proper crust_type and names
      if (!uniqueVariants.has(key) || (variant.crust_type && variant.name && !variant.name.includes("Inch"))) {
        uniqueVariants.set(key, variant);
      }
    });

    // Sort by price or sort_order
    return Array.from(uniqueVariants.values()).sort((a, b) => (a.sort_order || a.price || 0) - (b.sort_order || b.price || 0));
  }, [item.variants]);

  if (!organizedVariants.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No size options available for this item.</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-800">
          ← Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
        ← Back to Menu
      </button>

      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3">Choose Size for {item.name}</h4>

        <div className="grid grid-cols-2 gap-3">
          {organizedVariants.map((variant) => (
            <VariantCard key={variant.id} variant={variant} onSelect={() => onVariantSelect(variant)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VARIANT CARD COMPONENT
// ==========================================
interface VariantCardProps {
  variant: MenuItemVariant;
  onSelect: () => void;
}

function VariantCard({ variant, onSelect }: VariantCardProps) {
  const getDisplayName = () => {
    if (variant.name && !variant.name.includes("Inch")) {
      return variant.name;
    }

    // Construct name from size_code and crust_type
    let name = variant.size_code;
    if (variant.crust_type && variant.crust_type !== "default") {
      name += ` ${variant.crust_type.replace("_", " ")}`;
    }
    return name;
  };

  return (
    <button
      onClick={onSelect}
      className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all"
    >
      <div className="font-semibold text-gray-900 capitalize">{getDisplayName()}</div>
      {variant.serves && <div className="text-sm text-gray-600">{variant.serves}</div>}
      {variant.crust_type && variant.crust_type !== "default" && (
        <div className="text-sm text-gray-600 capitalize">{variant.crust_type.replace("_", " ")} crust</div>
      )}
      <div className="text-lg font-bold text-green-600 mt-2">${(variant.price || 0).toFixed(2)}</div>
    </button>
  );
}

// ==========================================
// CATEGORY GRID COMPONENT (Enhanced)
// ==========================================
interface CategoryGridProps {
  categorizedItems: Record<
    string,
    {
      pizzas: MenuItemWithVariants[];
      stuffedPizzas: MenuItemWithVariants[];
      customizable: MenuItemWithVariants[];
      variants: MenuItemWithVariants[];
      beverages: MenuItemWithVariants[];
      sides: MenuItemWithVariants[];
      other: MenuItemWithVariants[];
    }
  >;
  onItemSelect: (item: MenuItemWithVariants) => void;
  getCustomizationStrategy: (item: MenuItemWithVariants) => CustomizationStrategy;
}

function CategoryGrid({ categorizedItems, onItemSelect, getCustomizationStrategy }: CategoryGridProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categorizedItems;

    const filtered: typeof categorizedItems = {};
    Object.entries(categorizedItems).forEach(([category, items]) => {
      const categoryFiltered = {
        pizzas: items.pizzas.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        stuffedPizzas: items.stuffedPizzas.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        customizable: items.customizable.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        variants: items.variants.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        beverages: items.beverages.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        sides: items.sides.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        other: items.other.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
      };

      const hasItems = Object.values(categoryFiltered).some((arr) => arr.length > 0);
      if (hasItems) {
        filtered[category] = categoryFiltered;
      }
    });

    return filtered;
  }, [categorizedItems, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-6 max-h-[500px] overflow-y-auto">
        {Object.entries(filteredCategories).map(([category, items]) => (
          <CategorySection
            key={category}
            categoryName={category}
            items={items}
            onItemSelect={onItemSelect}
            getCustomizationStrategy={getCustomizationStrategy}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// CATEGORY SECTION COMPONENT (Enhanced)
// ==========================================
interface CategorySectionProps {
  categoryName: string;
  items: {
    pizzas: MenuItemWithVariants[];
    stuffedPizzas: MenuItemWithVariants[];
    customizable: MenuItemWithVariants[];
    variants: MenuItemWithVariants[];
    beverages: MenuItemWithVariants[];
    sides: MenuItemWithVariants[];
    other: MenuItemWithVariants[];
  };
  onItemSelect: (item: MenuItemWithVariants) => void;
  getCustomizationStrategy: (item: MenuItemWithVariants) => CustomizationStrategy;
}

function CategorySection({ categoryName, items, onItemSelect, getCustomizationStrategy }: CategorySectionProps) {
  const allItems = [
    ...items.pizzas,
    ...items.stuffedPizzas,
    ...items.customizable,
    ...items.variants,
    ...items.beverages,
    ...items.sides,
    ...items.other,
  ];

  if (allItems.length === 0) return null;

  return (
    <div>
      <h4 className="text-md font-semibold text-gray-900 mb-3 sticky top-0 bg-gray-50 py-1">
        {categoryName} <span className="text-sm font-normal text-gray-600">({allItems.length})</span>
      </h4>

      <div className="grid grid-cols-1 gap-3">
        {allItems.map((item) => (
          <TypeAwareItemCard key={item.id} item={item} strategy={getCustomizationStrategy(item)} onSelect={() => onItemSelect(item)} />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// TYPE-AWARE ITEM CARD COMPONENT
// ==========================================
interface TypeAwareItemCardProps {
  item: MenuItemWithVariants;
  strategy: CustomizationStrategy;
  onSelect: () => void;
}

function TypeAwareItemCard({ item, strategy, onSelect }: TypeAwareItemCardProps) {
  const hasVariants = item.variants && item.variants.length > 0;

  const getPriceDisplay = () => {
    if (hasVariants && item.variants.length > 0) {
      const prices = item.variants.map((v) => v.price || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) {
        return `$${minPrice.toFixed(2)}`;
      } else {
        return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
      }
    } else {
      return `$${(item.base_price || 0).toFixed(2)}`;
    }
  };

  const getActionText = () => {
    switch (strategy) {
      case "full_pizza":
        return "Customize Pizza";
      case "stuffed_pizza":
        return "Customize Stuffed Pizza";
      case "variant_selection":
        return "Choose Size";
      case "simple_quantity":
        return "Customize";
      case "direct_add":
        return "Add to Cart";
      default:
        return "Select";
    }
  };

  const getStrategyBadge = () => {
    switch (strategy) {
      case "full_pizza":
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">🍕 Pizza</span>;
      case "stuffed_pizza":
        return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">🥧 Stuffed</span>;
      case "variant_selection":
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">📏 Sizes</span>;
      case "simple_quantity":
        return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">⚙️ Custom</span>;
      case "direct_add":
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">➕ Quick Add</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">❓ Standard</span>;
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

          {item.description && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>}

          <div className="flex items-center gap-2 text-xs mb-2">
            {getStrategyBadge()}
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{item.item_type}</span>
            <span className="text-gray-500">~{item.prep_time_minutes || 15} min</span>
          </div>
        </div>

        <div className="text-right ml-4">
          <div className="text-lg font-bold text-green-600">{getPriceDisplay()}</div>
          <div className="text-xs text-blue-600 mt-1">{getActionText()}</div>
        </div>
      </div>
    </button>
  );
}

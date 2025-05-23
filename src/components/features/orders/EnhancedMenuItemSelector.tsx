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
import ModalPizzaCustomizer from "./ModalPizzaCustomizer";

/**
 * FIXED: Enhanced Menu Item Selector with Modal Customizer Integration
 *
 * Key fixes applied:
 * 1. Switched from FullScreenPizzaCustomizer to ModalPizzaCustomizer
 * 2. Added proper null checks to prevent runtime errors
 * 3. Enhanced type safety throughout
 * 4. Fixed cart item creation logic
 * 5. Added error boundaries and validation
 */

interface EnhancedMenuItemSelectorProps {
  menuItems: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
  onAddToCart: (configuredItem: ConfiguredCartItem) => void;
}

export default function EnhancedMenuItemSelector({
  menuItems,
  toppings,
  modifiers,
  onAddToCart,
}: EnhancedMenuItemSelectorProps) {
  // ==========================================
  // STATE MANAGEMENT - SIMPLIFIED & SAFER
  // ==========================================

  const [selectedItem, setSelectedItem] = useState<MenuItemWithVariants | null>(
    null
  );
  const [selectedVariant, setSelectedVariant] =
    useState<MenuItemVariant | null>(null);

  // FIXED: Modal state management with proper typing
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [customizerItem, setCustomizerItem] =
    useState<ConfiguredCartItem | null>(null);

  // ==========================================
  // MENU ORGANIZATION
  // ==========================================

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
  // FIXED: ITEM SELECTION LOGIC
  // ==========================================

  const handleItemSelect = (item: MenuItemWithVariants) => {
    console.log(
      "Item selected:",
      item.name,
      "Allows customization:",
      item.allows_custom_toppings
    );

    setSelectedItem(item);

    // STRATEGY 1: Items that allow customization get the modal experience
    if (item.allows_custom_toppings || item.item_type === "pizza") {
      openModalCustomizer(item);
    }
    // STRATEGY 2: Items with multiple variants need size selection
    else if (item.variants && item.variants.length > 1) {
      // Keep the current variant selection logic for non-customizable items
      return; // Let the UI show variant selector
    }
    // STRATEGY 3: Single variant items go straight to cart
    else if (item.variants && item.variants.length === 1) {
      addBasicItemToCart(item, item.variants[0]);
    }
    // STRATEGY 4: No variants, add as basic item
    else {
      addBasicItemToCart(item);
    }
  };

  // ==========================================
  // FIXED: MODAL CUSTOMIZER INTEGRATION
  // ==========================================

  const openModalCustomizer = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ) => {
    console.log("Opening modal customizer for:", item.name);

    // FIXED: Create a proper ConfiguredCartItem for the modal
    const cartItem = createBasicCartItem(item, variant);
    setCustomizerItem(cartItem);
    setShowCustomizerModal(true);
  };

  const handleCustomizerComplete = (configuredItem: ConfiguredCartItem) => {
    console.log("Customizer completed with item:", configuredItem);

    // FIXED: Add proper validation before adding to cart
    if (isValidConfiguredCartItem(configuredItem)) {
      onAddToCart(configuredItem);
    } else {
      console.error("Invalid cart item configuration:", configuredItem);
      alert("Error: Invalid item configuration. Please try again.");
    }

    // Clean up modal state
    setShowCustomizerModal(false);
    setCustomizerItem(null);
    setSelectedItem(null);
  };

  const handleCustomizerCancel = () => {
    console.log("Customizer cancelled");
    setShowCustomizerModal(false);
    setCustomizerItem(null);
    setSelectedItem(null);
  };

  // ==========================================
  // FIXED: VARIANT SELECTION
  // ==========================================

  const handleVariantSelect = (variant: MenuItemVariant) => {
    if (!selectedItem) {
      console.error("No selected item for variant selection");
      return;
    }

    console.log(
      "Variant selected:",
      variant.name,
      "for item:",
      selectedItem.name
    );
    setSelectedVariant(variant);

    // Check if this variant item allows customization
    if (
      selectedItem.allows_custom_toppings ||
      selectedItem.item_type === "pizza"
    ) {
      openModalCustomizer(selectedItem, variant);
    } else {
      addBasicItemToCart(selectedItem, variant);
    }
  };

  // ==========================================
  // FIXED: CART ITEM CREATION WITH VALIDATION
  // ==========================================

  const addBasicItemToCart = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ) => {
    try {
      const cartItem: ConfiguredCartItem = createBasicCartItem(item, variant);

      if (isValidConfiguredCartItem(cartItem)) {
        console.log("Adding basic item to cart:", cartItem.displayName);
        onAddToCart(cartItem);
      } else {
        console.error("Invalid cart item created:", cartItem);
        alert("Error creating cart item. Please try again.");
      }
    } catch (error) {
      console.error("Error creating cart item:", error);
      alert("Error adding item to cart. Please try again.");
    }

    // Clean up selection state
    setSelectedItem(null);
    setSelectedVariant(null);
  };

  // ==========================================
  // FIXED: SAFE CART ITEM CREATION
  // ==========================================

  const createBasicCartItem = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ): ConfiguredCartItem => {
    const basePrice = variant?.price ?? item.base_price ?? 0;
    const defaultToppings = getDefaultToppings(item);

    return {
      id: generateCartItemId(),
      menuItemId: item.id,
      menuItemName: item.name || "Unknown Item",
      // FIXED: Handle null properly - convert to undefined for the interface
      variantId: variant?.id ?? undefined,
      variantName: variant?.name ?? undefined,
      quantity: 1,
      basePrice: basePrice,
      selectedToppings: defaultToppings,
      selectedModifiers: [],
      totalPrice: basePrice,
      displayName: createDisplayName(item, variant),
      specialInstructions: "", // FIXED: Always provide default empty string
    };
  };

  // ==========================================
  // FIXED: VALIDATION FUNCTIONS
  // ==========================================

  const isValidConfiguredCartItem = (item: ConfiguredCartItem): boolean => {
    return !!(
      (
        item &&
        item.id &&
        item.menuItemId &&
        item.menuItemName &&
        typeof item.quantity === "number" &&
        item.quantity > 0 &&
        typeof item.basePrice === "number" &&
        item.basePrice >= 0 &&
        typeof item.totalPrice === "number" &&
        item.totalPrice >= 0 &&
        item.displayName &&
        Array.isArray(item.selectedToppings) &&
        Array.isArray(item.selectedModifiers) &&
        typeof item.specialInstructions === "string"
      ) // FIXED: Must be string, not null
    );
  };

  // ==========================================
  // UTILITY FUNCTIONS - ENHANCED WITH SAFETY
  // ==========================================

  const getDefaultToppings = (
    item: MenuItemWithVariants
  ): ConfiguredTopping[] => {
    const defaultToppings: ConfiguredTopping[] = [];

    if (item.default_toppings_json && item.item_type === "pizza") {
      try {
        const config = item.default_toppings_json as {
          toppings?: Array<{
            id: string;
            name: string;
            amount?: ToppingAmount;
          }>;
        };

        if (config?.toppings && Array.isArray(config.toppings)) {
          config.toppings.forEach((topping) => {
            if (topping.id && topping.name) {
              defaultToppings.push({
                id: topping.id,
                name: topping.name,
                amount: topping.amount || "normal",
                price: 0,
                isDefault: true,
                category: "default",
              });
            }
          });
        }
      } catch (error) {
        console.error("Error parsing default toppings:", error);
      }
    }

    // Business rule: All pizzas should have cheese unless explicitly configured otherwise
    if (
      item.item_type === "pizza" &&
      !defaultToppings.some((t) => t.name.toLowerCase().includes("cheese"))
    ) {
      defaultToppings.push({
        id: "default-cheese",
        name: "Cheese",
        amount: "normal",
        price: 0,
        isDefault: true,
        category: "cheese",
      });
    }

    return defaultToppings;
  };

  const createDisplayName = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ): string => {
    if (variant?.name) {
      return `${variant.name} ${item.name || "Item"}`;
    }
    return item.name || "Unknown Item";
  };

  const generateCartItemId = (): string => {
    return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // ==========================================
  // FIXED: RENDER LOGIC WITH MODAL
  // ==========================================

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {selectedItem && !selectedVariant && !showCustomizerModal
          ? `Select Size for ${selectedItem.name}`
          : "Select Menu Item"}
      </h3>

      {/* FIXED: Conditional rendering logic */}
      {selectedItem &&
      selectedItem.variants.length > 0 &&
      !selectedVariant &&
      !showCustomizerModal ? (
        <VariantSelector
          item={selectedItem}
          onVariantSelect={handleVariantSelect}
          onBack={() => setSelectedItem(null)}
        />
      ) : !showCustomizerModal ? (
        <MenuItemGrid
          itemsByCategory={itemsByCategory}
          onItemSelect={handleItemSelect}
        />
      ) : null}

      {/* FIXED: Modal Integration with correct props */}
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
// VARIANT SELECTOR COMPONENT - ENHANCED
// ==========================================

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
  const orderedVariants = useMemo(() => {
    if (!item.variants || item.variants.length === 0) {
      return [];
    }

    const sizeOrder: Record<string, number> = {
      small: 1,
      medium: 2,
      large: 3,
      "extra large": 4,
      xl: 4,
    };

    return [...item.variants].sort((a, b) => {
      const aSize =
        Object.keys(sizeOrder).find((size) =>
          (a.name || "").toLowerCase().includes(size.toLowerCase())
        ) || "";

      const bSize =
        Object.keys(sizeOrder).find((size) =>
          (b.name || "").toLowerCase().includes(size.toLowerCase())
        ) || "";

      const aOrder = sizeOrder[aSize.toLowerCase()] || 999;
      const bOrder = sizeOrder[bSize.toLowerCase()] || 999;

      return aOrder - bOrder;
    });
  }, [item.variants]);

  if (!orderedVariants.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No variants available for this item.</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Menu
        </button>
      </div>
    );
  }

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
              <div className="font-semibold text-gray-900">
                {variant.name || "Unknown Size"}
              </div>
              {variant.serves && (
                <div className="text-sm text-gray-600">
                  Serves {variant.serves}
                </div>
              )}
              {variant.crust_type && (
                <div className="text-sm text-gray-600">
                  {variant.crust_type} crust
                </div>
              )}
              <div className="text-lg font-bold text-green-600 mt-2">
                ${(variant.price || 0).toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU ITEM GRID COMPONENT - ENHANCED
// ==========================================

interface MenuItemGridProps {
  itemsByCategory: Record<string, MenuItemWithVariants[]>;
  onItemSelect: (item: MenuItemWithVariants) => void;
}

function MenuItemGrid({ itemsByCategory, onItemSelect }: MenuItemGridProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return itemsByCategory;

    const filtered: Record<string, MenuItemWithVariants[]> = {};

    Object.entries(itemsByCategory).forEach(([category, items]) => {
      const matchingItems = items.filter((item) =>
        (item.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchingItems.length > 0) {
        filtered[category] = matchingItems;
      }
    });

    return filtered;
  }, [itemsByCategory, searchTerm]);

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
            {searchTerm
              ? `No items found matching "${searchTerm}"`
              : "No menu items available"}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MENU ITEM CARD COMPONENT - ENHANCED
// ==========================================

interface MenuItemCardProps {
  item: MenuItemWithVariants;
  onSelect: () => void;
}

function MenuItemCard({ item, onSelect }: MenuItemCardProps) {
  const hasVariants = item.variants && item.variants.length > 0;
  const allowsCustomization =
    item.allows_custom_toppings || item.item_type === "pizza";

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

  return (
    <button
      onClick={onSelect}
      className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all w-full"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900 mb-1">
            {item.name || "Unknown Item"}
          </h5>

          {item.description && (
            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
          )}

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

            <span className="text-gray-500">
              ~{item.prep_time_minutes || 15} min
            </span>
          </div>
        </div>

        <div className="text-right ml-4">
          <div className="text-lg font-bold text-green-600">
            {getPriceDisplay()}
          </div>
          {hasVariants && (
            <div className="text-xs text-gray-500">Choose size</div>
          )}
          {allowsCustomization && (
            <div className="text-xs text-gray-500 mt-1">Click to customize</div>
          )}
        </div>
      </div>
    </button>
  );
}

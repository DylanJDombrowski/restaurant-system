// src/components/features/orders/EnhancedMenuItemSelector.tsx
"use client";
import { useState, useMemo } from "react";
import {
  MenuItemWithVariants,
  MenuItemVariant,
  Topping,
  Modifier,
} from "@/lib/types";
import {
  ConfiguredCartItem,
  ConfiguredTopping,
  ToppingAmount,
} from "@/lib/types";

/**
 * Enhanced Menu Item Selector Component
 *
 * This component transforms the simple menu selection into a sophisticated
 * item configuration system. It handles the progressive disclosure approach:
 * 1. Show available menu items
 * 2. If item has variants, show variant selection
 * 3. Add basic item to cart with option to customize
 *
 * Think of this as the conversation starter between staff and customer.
 */

interface EnhancedMenuItemSelectorProps {
  menuItems: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
  onAddToCart: (configuredItem: ConfiguredCartItem) => void;
}

export default function EnhancedMenuItemSelector({
  menuItems,
  onAddToCart,
}: EnhancedMenuItemSelectorProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItemWithVariants | null>(
    null
  );
  const [selectedVariant, setSelectedVariant] =
    useState<MenuItemVariant | null>(null);

  // Group menu items by category for better organization
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

  // Handle item selection - determines if we need variant selection
  const handleItemSelect = (item: MenuItemWithVariants) => {
    setSelectedItem(item);

    // If item has variants, show variant selection
    if (item.variants && item.variants.length > 0) {
      setSelectedVariant(null);
    } else {
      // No variants, add directly to cart with basic configuration
      addBasicItemToCart(item);
    }
  };

  // Handle variant selection - adds item to cart or opens customizer
  const handleVariantSelect = (variant: MenuItemVariant) => {
    if (!selectedItem) return;

    setSelectedVariant(variant);

    // Add basic item to cart (customer can customize later if needed)
    addBasicItemToCart(selectedItem, variant);
  };

  // Add item to cart with basic configuration
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

    // Reset selection state
    setSelectedItem(null);
    setSelectedVariant(null);
  };

  // Get default toppings for specialty pizzas
  const getDefaultToppings = (
    item: MenuItemWithVariants
  ): ConfiguredTopping[] => {
    // If item has default toppings (like specialty pizzas), parse them
    if (item.default_toppings_json && item.item_type === "pizza") {
      try {
        const defaultConfig = item.default_toppings_json as {
          toppings: { id: string; name: string; amount?: ToppingAmount }[];
        };
        if (defaultConfig && defaultConfig.toppings) {
          return defaultConfig.toppings.map(
            (topping: {
              id: string;
              name: string;
              amount?: ToppingAmount;
            }) => ({
              id: topping.id,
              name: topping.name,
              amount: topping.amount || "normal",
              price: 0, // Default toppings don't add to price
              isDefault: true,
            })
          );
        }
      } catch (error) {
        console.error("Error parsing default toppings:", error);
      }
    }

    // For cheese default on pizzas
    if (item.item_type === "pizza") {
      return [
        {
          id: "cheese",
          name: "Cheese",
          amount: "normal" as const,
          price: 0,
          isDefault: true,
        },
      ];
    }

    return [];
  };

  // Create human-readable display name
  const createDisplayName = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ): string => {
    if (variant) {
      return `${variant.name} ${item.name}`;
    }
    return item.name;
  };

  // Generate unique cart item ID
  const generateCartItemId = (): string => {
    return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

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

/**
 * Variant Selector Component
 *
 * This component handles size and crust selection for pizzas.
 * It's organized according to your specifications:
 * 1. Size selection first
 * 2. Then crust type (regular thin, specialty, double dough, deep dish)
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
  // Group variants by size and crust type for organization
  const variantsBySize = useMemo(() => {
    const grouped = item.variants.reduce((acc, variant) => {
      // Extract size from variant name (e.g., "Small 10\"" -> "Small")
      const sizeMatch = variant.name.match(/^(Small|Medium|Large|Extra Large)/);
      const size = sizeMatch ? sizeMatch[1] : "Unknown";

      if (!acc[size]) {
        acc[size] = [];
      }
      acc[size].push(variant);
      return acc;
    }, {} as Record<string, MenuItemVariant[]>);

    return grouped;
  }, [item.variants]);

  const sizeOrder = ["Small", "Medium", "Large", "Extra Large"];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        ← Back to Menu
      </button>

      {/* Size selection */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          Choose Size for {item.name}
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {sizeOrder.map((size) => {
            const variants = variantsBySize[size];
            if (!variants) return null;

            return variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => onVariantSelect(variant)}
                className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="font-semibold text-gray-900">
                  {variant.name}
                </div>
                <div className="text-sm text-gray-600">
                  {variant.serves && `${variant.serves} • `}
                  {variant.crust_type && `${variant.crust_type} crust`}
                </div>
                <div className="text-lg font-bold text-green-600 mt-2">
                  ${variant.price.toFixed(2)}
                </div>
              </button>
            ));
          })}
        </div>
      </div>

      {/* Information about customization */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 After adding to cart, you can click Customize to modify toppings,
          cooking instructions, and other preferences.
        </p>
      </div>
    </div>
  );
}

/**
 * Menu Item Grid Component
 *
 * Displays menu items organized by category with clear indicators
 * for items that have variants or customization options.
 */
interface MenuItemGridProps {
  itemsByCategory: Record<string, MenuItemWithVariants[]>;
  onItemSelect: (item: MenuItemWithVariants) => void;
}

function MenuItemGrid({ itemsByCategory, onItemSelect }: MenuItemGridProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter items based on search
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
      {/* Search bar */}
      <div>
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Menu categories */}
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
            No items found matching {searchTerm}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Menu Item Card Component
 *
 * Displays individual menu items with indicators for variants and customization.
 */
interface MenuItemCardProps {
  item: MenuItemWithVariants;
  onSelect: () => void;
}

function MenuItemCard({ item, onSelect }: MenuItemCardProps) {
  const hasVariants = item.variants && item.variants.length > 0;
  const allowsCustomization = item.allows_custom_toppings;

  // Determine pricing display
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

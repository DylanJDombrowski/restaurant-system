// src/components/features/orders/SmartMenuItemSelector.tsx
"use client";
import { useState, useMemo } from "react";
import {
  MenuItemWithVariants,
  MenuItemVariant,
  Topping,
  Modifier,
  ConfiguredCartItem,
  getItemCustomizationLevel,
  shouldShowCustomizer,
  needsVariantSelection,
} from "@/lib/types";
import ModalPizzaCustomizer from "./ModalPizzaCustomizer";

/**
 * 🎯 SMART Menu Item Selector - Routes items by type
 *
 * Business Logic:
 * - Pizza items (item_type="pizza") → Full customization modal
 * - Items with variants → Size selection interface
 * - Sides/condiments → Direct add to cart
 * - Everything else → Simple quantity selection
 */

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
  // SMART CATEGORIZATION
  // ==========================================
  const categorizedItems = useMemo(() => {
    const categories = menuItems.reduce(
      (acc, item) => {
        const categoryName = item.category?.name || "Other";
        if (!acc[categoryName]) {
          acc[categoryName] = {
            pizza: [],
            customizable: [],
            variants: [],
            simple: [],
          };
        }

        // Route items based on business logic
        if (item.item_type === "pizza") {
          acc[categoryName].pizza.push(item);
        } else if (shouldShowCustomizer(item)) {
          acc[categoryName].customizable.push(item);
        } else if (needsVariantSelection(item)) {
          acc[categoryName].variants.push(item);
        } else {
          acc[categoryName].simple.push(item);
        }

        return acc;
      },
      {} as Record<
        string,
        {
          pizza: MenuItemWithVariants[];
          customizable: MenuItemWithVariants[];
          variants: MenuItemWithVariants[];
          simple: MenuItemWithVariants[];
        }
      >
    );

    return categories;
  }, [menuItems]);

  // ==========================================
  // SMART ITEM SELECTION LOGIC
  // ==========================================
  const handleItemSelect = (item: MenuItemWithVariants) => {
    console.log(`🎯 Smart routing for: ${item.name} (type: ${item.item_type})`);
    setSelectedItem(item);

    const customizationLevel = getItemCustomizationLevel(item);

    switch (customizationLevel) {
      case "full":
        // Pizza items with full customization
        console.log("→ Opening full pizza customizer");
        openPizzaCustomizer(item);
        break;

      case "variants":
        // Items with size selection but limited customization
        console.log("→ Showing variant selection");
        if (item.variants && item.variants.length === 1) {
          // Only one variant, skip selection
          handleVariantSelect(item.variants[0]);
        }
        // Otherwise, show variant selector (handled by render logic)
        break;

      case "simple":
        // Single variant items
        console.log("→ Adding as simple item");
        const variant = item.variants?.[0];
        addDirectToCart(item, variant);
        break;

      case "none":
        // Direct add items (sides, condiments)
        console.log("→ Adding directly to cart");
        addDirectToCart(item);
        break;

      default:
        console.warn("Unknown customization level:", customizationLevel);
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

    // Check if this variant needs pizza customization
    if (selectedItem.item_type === "pizza") {
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

    // Get default toppings for pizza items
    const defaultToppings = item.item_type === "pizza" ? getDefaultToppings(item) : [];

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

  const getDefaultToppings = (item: MenuItemWithVariants) => {
    // Extract default toppings from pizza configuration
    const defaultToppings: { id: any; name: any; amount: any; price: number; isDefault: boolean; category: string }[] = [];

    try {
      if (item.default_toppings_json && typeof item.default_toppings_json === "object") {
        const config = item.default_toppings_json as any;
        if (config.toppings && Array.isArray(config.toppings)) {
          config.toppings.forEach((topping: any) => {
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
      }
    } catch (error) {
      console.error("Error parsing default toppings:", error);
    }

    return defaultToppings;
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {selectedItem && !selectedVariant && !showCustomizerModal ? `Select Size for ${selectedItem.name}` : "Select Menu Item"}
      </h3>

      {/* Show variant selector if item is selected and has variants */}
      {selectedItem && needsVariantSelection(selectedItem) && !selectedVariant && !showCustomizerModal ? (
        <VariantSelector item={selectedItem} onVariantSelect={handleVariantSelect} onBack={() => setSelectedItem(null)} />
      ) : !showCustomizerModal ? (
        <CategoryGrid categorizedItems={categorizedItems} onItemSelect={handleItemSelect} />
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
// VARIANT SELECTOR COMPONENT
// ==========================================
interface VariantSelectorProps {
  item: MenuItemWithVariants;
  onVariantSelect: (variant: MenuItemVariant) => void;
  onBack: () => void;
}

function VariantSelector({ item, onVariantSelect, onBack }: VariantSelectorProps) {
  // Filter out variants with null crust_type for cleaner display
  const cleanVariants = useMemo(() => {
    if (!item.variants) return [];

    // Group variants by size, prioritizing those with crust_type
    const variantGroups = item.variants.reduce((acc, variant) => {
      const size = variant.size_code;
      if (!acc[size]) acc[size] = [];
      acc[size].push(variant);
      return acc;
    }, {} as Record<string, MenuItemVariant[]>);

    // For each size, prefer variants with crust_type over null
    const cleanedVariants: MenuItemVariant[] = [];
    Object.entries(variantGroups).forEach(([size, variants]) => {
      if (variants.length === 1) {
        cleanedVariants.push(variants[0]);
      } else {
        // Prefer variants with proper crust_type
        const withCrust = variants.filter((v) => v.crust_type);
        const withoutCrust = variants.filter((v) => !v.crust_type);

        if (withCrust.length > 0) {
          cleanedVariants.push(...withCrust);
        } else {
          cleanedVariants.push(withoutCrust[0]); // Take first as fallback
        }
      }
    });

    return cleanedVariants.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [item.variants]);

  if (!cleanVariants.length) {
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
          {cleanVariants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => onVariantSelect(variant)}
              className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="font-semibold text-gray-900">{variant.name || `${variant.size_code} Size`}</div>
              {variant.serves && <div className="text-sm text-gray-600">{variant.serves}</div>}
              {variant.crust_type && <div className="text-sm text-gray-600 capitalize">{variant.crust_type.replace("_", " ")} crust</div>}
              <div className="text-lg font-bold text-green-600 mt-2">${variant.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CATEGORY GRID COMPONENT
// ==========================================
interface CategoryGridProps {
  categorizedItems: Record<
    string,
    {
      pizza: MenuItemWithVariants[];
      customizable: MenuItemWithVariants[];
      variants: MenuItemWithVariants[];
      simple: MenuItemWithVariants[];
    }
  >;
  onItemSelect: (item: MenuItemWithVariants) => void;
}

function CategoryGrid({ categorizedItems, onItemSelect }: CategoryGridProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categorizedItems;

    const filtered: typeof categorizedItems = {};
    Object.entries(categorizedItems).forEach(([category, items]) => {
      const categoryFiltered = {
        pizza: items.pizza.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        customizable: items.customizable.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        variants: items.variants.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
        simple: items.simple.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
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
          <CategorySection key={category} categoryName={category} items={items} onItemSelect={onItemSelect} />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// CATEGORY SECTION COMPONENT
// ==========================================
interface CategorySectionProps {
  categoryName: string;
  items: {
    pizza: MenuItemWithVariants[];
    customizable: MenuItemWithVariants[];
    variants: MenuItemWithVariants[];
    simple: MenuItemWithVariants[];
  };
  onItemSelect: (item: MenuItemWithVariants) => void;
}

function CategorySection({ categoryName, items, onItemSelect }: CategorySectionProps) {
  const allItems = [...items.pizza, ...items.customizable, ...items.variants, ...items.simple];

  if (allItems.length === 0) return null;

  return (
    <div>
      <h4 className="text-md font-semibold text-gray-900 mb-3 sticky top-0 bg-gray-50 py-1">{categoryName}</h4>

      <div className="grid grid-cols-1 gap-3">
        {allItems.map((item) => (
          <SmartItemCard key={item.id} item={item} onSelect={() => onItemSelect(item)} />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// SMART ITEM CARD COMPONENT
// ==========================================
interface SmartItemCardProps {
  item: MenuItemWithVariants;
  onSelect: () => void;
}

function SmartItemCard({ item, onSelect }: SmartItemCardProps) {
  const customizationLevel = getItemCustomizationLevel(item);
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
    switch (customizationLevel) {
      case "full":
        return "Customize Pizza";
      case "variants":
        return "Choose Size";
      case "simple":
        return "Add to Cart";
      case "none":
        return "Add to Cart";
      default:
        return "Select";
    }
  };

  const getItemTypeIndicator = () => {
    switch (customizationLevel) {
      case "full":
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Pizza</span>;
      case "variants":
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Multiple Sizes</span>;
      case "simple":
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Ready to Order</span>;
      case "none":
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">Side Item</span>;
      default:
        return null;
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

          {item.description && <p className="text-sm text-gray-600 mb-2">{item.description}</p>}

          <div className="flex items-center gap-2 text-xs mb-2">
            {getItemTypeIndicator()}
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

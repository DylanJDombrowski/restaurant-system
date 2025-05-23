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
import ModalPizzaCustomizer from "@/components/features/orders/ModalPizzaCustomizer";

/**
 * 🚀 ENHANCED Menu Item Selector with Major Improvements:
 *
 * ✅ Collapsible search (icon-based, expands on click)
 * ✅ Category-first navigation with tabs
 * ✅ Quick-add specialty pizzas vs customizable options
 * ✅ Better visual hierarchy and performance
 * ✅ Mobile-responsive design
 */

interface EnhancedMenuItemSelectorProps {
  menuItems: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
  onAddToCart: (configuredItem: ConfiguredCartItem) => void;
}

export function EnhancedMenuItemSelector({
  menuItems,
  toppings,
  modifiers,
  onAddToCart,
}: EnhancedMenuItemSelectorProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [selectedItem, setSelectedItem] = useState<MenuItemWithVariants | null>(
    null
  );
  const [selectedVariant, setSelectedVariant] =
    useState<MenuItemVariant | null>(null);

  // 🆕 NEW: Collapsible search state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 🆕 NEW: Category navigation
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Modal state
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [customizerItem, setCustomizerItem] =
    useState<ConfiguredCartItem | null>(null);

  // ==========================================
  // 🆕 ENHANCED MENU ORGANIZATION
  // ==========================================

  const { categorizedItems, categoryList } = useMemo(() => {
    // Group items by category
    const grouped = menuItems.reduce((acc, item) => {
      const categoryName = item.category?.name || "Other";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    }, {} as Record<string, MenuItemWithVariants[]>);

    // Define category order and display info
    const categoryOrder = [
      { key: "Regular Pizzas", label: "Pizzas", icon: "🍕", priority: 1 },
      { key: "Stuffed Pizzas", label: "Stuffed", icon: "🥙", priority: 2 },
      { key: "Chicken", label: "Chicken", icon: "🍗", priority: 3 },
      { key: "Appetizers", label: "Apps", icon: "🧀", priority: 4 },
      { key: "Beverages", label: "Drinks", icon: "🥤", priority: 5 },
      // Add more as you expand your menu
    ];

    // Sort categories by priority and add "All" option
    const sortedCategories = [
      { key: "all", label: "All", icon: "📋", priority: 0 },
      ...categoryOrder.filter((cat) => grouped[cat.key]),
      // Add any other categories not in the predefined list
      ...Object.keys(grouped)
        .filter((key) => !categoryOrder.find((cat) => cat.key === key))
        .map((key) => ({ key, label: key, icon: "📝", priority: 999 })),
    ].sort((a, b) => a.priority - b.priority);

    return {
      categorizedItems: grouped,
      categoryList: sortedCategories,
    };
  }, [menuItems]);

  // ==========================================
  // 🆕 SMART FILTERING LOGIC
  // ==========================================

  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Filter by category first
    if (activeCategory !== "all") {
      items = items.filter((item) => item.category?.name === activeCategory);
    }

    // Then filter by search term if search is active
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          (item.name || "").toLowerCase().includes(term) ||
          (item.description || "").toLowerCase().includes(term)
      );
    }

    return items;
  }, [menuItems, activeCategory, searchTerm]);

  // ==========================================
  // ITEM SELECTION LOGIC (enhanced)
  // ==========================================

  const handleItemSelect = (item: MenuItemWithVariants) => {
    setSelectedItem(item);

    // Enhanced decision logic for different item types
    if (item.allows_custom_toppings || item.item_type === "pizza") {
      // Pizza items get the customization experience
      openModalCustomizer(item);
    } else if (item.variants && item.variants.length > 1) {
      // Multi-variant non-pizza items (like chicken pieces) show variant selector
      return; // Let the UI show variant selector
    } else if (item.variants && item.variants.length === 1) {
      // Single variant items go straight to cart
      addBasicItemToCart(item, item.variants[0]);
    } else {
      // No variants, add as basic item (like beverages)
      addBasicItemToCart(item);
    }
  };

  // ==========================================
  // MODAL CUSTOMIZER INTEGRATION (enhanced)
  // ==========================================

  const openModalCustomizer = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ) => {
    const cartItem = createBasicCartItem(item, variant);
    setCustomizerItem(cartItem);
    setShowCustomizerModal(true);
  };

  const handleCustomizerComplete = (configuredItem: ConfiguredCartItem) => {
    if (isValidConfiguredCartItem(configuredItem)) {
      onAddToCart(configuredItem);
    } else {
      console.error("Invalid cart item configuration:", configuredItem);
      alert("Error: Invalid item configuration. Please try again.");
    }

    // Clean up
    setShowCustomizerModal(false);
    setCustomizerItem(null);
    setSelectedItem(null);
  };

  const handleCustomizerCancel = () => {
    setShowCustomizerModal(false);
    setCustomizerItem(null);
    setSelectedItem(null);
  };

  // ==========================================
  // VARIANT SELECTION (enhanced)
  // ==========================================

  const handleVariantSelect = (variant: MenuItemVariant) => {
    if (!selectedItem) return;

    setSelectedVariant(variant);

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
  // CART ITEM CREATION (same as before)
  // ==========================================

  const addBasicItemToCart = (
    item: MenuItemWithVariants,
    variant?: MenuItemVariant
  ) => {
    try {
      const cartItem: ConfiguredCartItem = createBasicCartItem(item, variant);

      if (isValidConfiguredCartItem(cartItem)) {
        onAddToCart(cartItem);
      } else {
        console.error("Invalid cart item created:", cartItem);
        alert("Error creating cart item. Please try again.");
      }
    } catch (error) {
      console.error("Error creating cart item:", error);
      alert("Error adding item to cart. Please try again.");
    }

    setSelectedItem(null);
    setSelectedVariant(null);
  };

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
      variantId: variant?.id ?? undefined,
      variantName: variant?.name ?? undefined,
      quantity: 1,
      basePrice: basePrice,
      selectedToppings: defaultToppings,
      selectedModifiers: [],
      totalPrice: basePrice,
      displayName: createDisplayName(item, variant),
      specialInstructions: "",
    };
  };

  // Helper functions (same as before)
  const isValidConfiguredCartItem = (item: ConfiguredCartItem): boolean => {
    return !!(
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
    );
  };

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
  // 🆕 ENHANCED RENDER WITH CATEGORY TABS
  // ==========================================

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full flex flex-col">
      {/* 🆕 ENHANCED HEADER with Category Tabs and Collapsible Search */}
      <div className="mb-4 space-y-3">
        {/* Top row: Title and Search Toggle */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedItem && !selectedVariant && !showCustomizerModal
              ? `Select Size for ${selectedItem.name}`
              : "Menu"}
          </h3>

          {/* 🆕 Collapsible Search Toggle */}
          <button
            onClick={() => {
              setSearchExpanded(!searchExpanded);
              if (!searchExpanded) {
                // Focus search input after animation
                setTimeout(() => {
                  document.getElementById("menu-search")?.focus();
                }, 100);
              } else {
                setSearchTerm("");
              }
            }}
            className={`p-2 rounded-lg transition-all duration-200 ${
              searchExpanded || searchTerm
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title={searchExpanded ? "Close search" : "Search menu"}
          >
            {searchExpanded ? "✕" : "🔍"}
          </button>
        </div>

        {/* 🆕 Collapsible Search Bar */}
        <div
          className={`transition-all duration-200 overflow-hidden ${
            searchExpanded ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <input
            id="menu-search"
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 🆕 Category Tabs */}
        {!selectedItem && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categoryList.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  activeCategory === category.key
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
                {category.key !== "all" && categorizedItems[category.key] && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      activeCategory === category.key
                        ? "bg-blue-500 text-blue-100"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {categorizedItems[category.key].length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 🆕 ENHANCED CONTENT AREA */}
      <div className="flex-1 overflow-hidden">
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
            items={filteredItems}
            onItemSelect={handleItemSelect}
            searchTerm={searchTerm}
            activeCategory={activeCategory}
          />
        ) : null}
      </div>

      {/* Modal Integration */}
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
// 🆕 ENHANCED MENU ITEM GRID
// ==========================================

interface MenuItemGridProps {
  items: MenuItemWithVariants[];
  onItemSelect: (item: MenuItemWithVariants) => void;
  searchTerm: string;
  activeCategory: string;
}

function MenuItemGrid({
  items,
  onItemSelect,
  searchTerm,
  activeCategory,
}: MenuItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">{searchTerm ? "🔍" : "📋"}</div>
        <div className="text-lg font-medium text-gray-900 mb-1">
          {searchTerm
            ? `No items found for "${searchTerm}"`
            : activeCategory !== "all"
            ? `No items in ${activeCategory}`
            : "No menu items available"}
        </div>
        <div className="text-sm">
          {searchTerm ? "Try a different search term" : "Check back later"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-full overflow-y-auto">
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
  );
}

// ==========================================
// 🆕 ENHANCED MENU ITEM CARD
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

  // 🆕 Enhanced visual design
  return (
    <button
      onClick={onSelect}
      className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-lg transition-all w-full group"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
            {item.name || "Unknown Item"}
          </h5>

          {item.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs">
            {hasVariants && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                Multiple Sizes
              </span>
            )}

            {allowsCustomization && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                Customizable
              </span>
            )}

            <span className="text-gray-500 font-medium">
              ~{item.prep_time_minutes || 15} min
            </span>
          </div>
        </div>

        <div className="text-right ml-4">
          <div className="text-lg font-bold text-green-600 mb-1">
            {getPriceDisplay()}
          </div>
          {hasVariants ? (
            <div className="text-xs text-gray-500">Choose size →</div>
          ) : allowsCustomization ? (
            <div className="text-xs text-blue-600 font-medium">Customize →</div>
          ) : (
            <div className="text-xs text-gray-500">Add to cart →</div>
          )}
        </div>
      </div>
    </button>
  );
}

// ==========================================
// VARIANT SELECTOR (enhanced styling)
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
      xlarge: 4,
    };

    return [...item.variants].sort((a, b) => {
      const aOrder = sizeOrder[a.size_code] || 999;
      const bOrder = sizeOrder[b.size_code] || 999;
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
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          Choose Size for {item.name}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {orderedVariants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => onVariantSelect(variant)}
              className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="font-semibold text-gray-900 mb-1">
                {variant.name || "Unknown Size"}
              </div>
              {variant.serves && (
                <div className="text-sm text-gray-600 mb-1">
                  {variant.serves}
                </div>
              )}
              {variant.crust_type && (
                <div className="text-sm text-gray-600 mb-2">
                  {variant.crust_type.replace("_", " ")} crust
                </div>
              )}
              <div className="text-lg font-bold text-green-600">
                ${(variant.price || 0).toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

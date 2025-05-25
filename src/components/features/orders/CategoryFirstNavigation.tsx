// src/components/features/orders/CategoryFirstNavigator.tsx
"use client";
import { useState, useMemo, useCallback } from "react";
import { MenuItemWithVariants, MenuItemVariant, MenuCategory, Topping, Modifier, ConfiguredCartItem } from "@/lib/types";
import ModalPizzaCustomizer from "./ModalPizzaCustomizer";
import SandwichCustomizer from "./SandwichCustomizer";
import AppetizerCustomizer from "./AppetizerCustomizer";

/**
 * 🎯 CATEGORY-FIRST NAVIGATION SYSTEM
 *
 * New Flow:
 * 1. Show category grid (Pizzas, Sandwiches, Appetizers, etc.)
 * 2. Click category → Show items in that category
 * 3. Click item → Route to appropriate customizer
 * 4. Back button returns to category or item list
 */

interface CategoryFirstNavigatorProps {
  menuItems: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
  onAddToCart: (configuredItem: ConfiguredCartItem) => void;
  restaurantId: string;
}

type NavigationView = "categories" | "category-items" | "customizing";

interface NavigationState {
  view: NavigationView;
  selectedCategory: MenuCategory | null;
  selectedItem: MenuItemWithVariants | null;
  selectedVariant: MenuItemVariant | null;
}

export default function CategoryFirstNavigator({ menuItems, toppings, modifiers, onAddToCart, restaurantId }: CategoryFirstNavigatorProps) {
  // ==========================================
  // NAVIGATION STATE
  // ==========================================
  const [navState, setNavState] = useState<NavigationState>({
    view: "categories",
    selectedCategory: null,
    selectedItem: null,
    selectedVariant: null,
  });

  // ==========================================
  // CUSTOMIZER STATES
  // ==========================================
  const [showPizzaCustomizer, setShowPizzaCustomizer] = useState(false);
  const [showSandwichCustomizer, setShowSandwichCustomizer] = useState(false);
  const [showAppetizerCustomizer, setShowAppetizerCustomizer] = useState(false);
  const [customizerItem, setCustomizerItem] = useState<ConfiguredCartItem | null>(null);

  // ==========================================
  // DATA ORGANIZATION
  // ==========================================

  // Group items by category
  const categorizedItems = useMemo(() => {
    const categoryMap = new Map<
      string,
      {
        category: MenuCategory;
        items: MenuItemWithVariants[];
      }
    >();

    menuItems.forEach((item) => {
      if (item.category) {
        const categoryId = item.category.id;

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            category: item.category,
            items: [],
          });
        }

        categoryMap.get(categoryId)!.items.push(item);
      }
    });

    // Convert to sorted array
    return Array.from(categoryMap.values()).sort((a, b) => a.category.sort_order - b.category.sort_order);
  }, [menuItems]);

  // Get items for currently selected category
  const currentCategoryItems = useMemo(() => {
    if (!navState.selectedCategory) return [];

    const categoryData = categorizedItems.find((cat) => cat.category.id === navState.selectedCategory!.id);

    return categoryData?.items || [];
  }, [categorizedItems, navState.selectedCategory]);

  // ==========================================
  // NAVIGATION HANDLERS
  // ==========================================

  const handleCategorySelect = useCallback((category: MenuCategory) => {
    console.log("📂 Selected category:", category.name);
    setNavState({
      view: "category-items",
      selectedCategory: category,
      selectedItem: null,
      selectedVariant: null,
    });
  }, []);

  const handleBackToCategories = useCallback(() => {
    console.log("← Back to categories");
    setNavState({
      view: "categories",
      selectedCategory: null,
      selectedItem: null,
      selectedVariant: null,
    });
  }, []);

  const handleBackToCategoryItems = useCallback(() => {
    console.log("← Back to category items");
    setNavState((prev) => ({
      ...prev,
      view: "category-items",
      selectedItem: null,
      selectedVariant: null,
    }));
  }, []);

  // ==========================================
  // ITEM SELECTION AND ROUTING
  // ==========================================

  const handleItemSelect = useCallback((item: MenuItemWithVariants) => {
    console.log("🍕 Selected item:", item.name, "Category:", item.category?.name);

    setNavState((prev) => ({
      ...prev,
      selectedItem: item,
    }));

    // Route to appropriate customizer based on category and item type
    if (item.category?.name === "Pizzas") {
      // Pizza customization flow
      if (item.variants && item.variants.length > 1) {
        // Show variant selector first, then customizer
        setNavState((prev) => ({ ...prev, view: "customizing" }));
        return;
      } else {
        // Direct to pizza customizer
        openPizzaCustomizer(item);
      }
    } else if (item.category?.name === "Sandwiches") {
      openSandwichCustomizer(item);
    } else if (item.category?.name === "Appetizers") {
      // Check for variants
      if (item.variants && item.variants.length > 1) {
        setNavState((prev) => ({ ...prev, view: "customizing" }));
        return;
      } else {
        openAppetizerCustomizer(item);
      }
    } else if (item.category?.name === "Beverages") {
      // Simple items - check for variants or direct add
      if (item.variants && item.variants.length > 1) {
        setNavState((prev) => ({ ...prev, view: "customizing" }));
        return;
      } else {
        addDirectToCart(item);
      }
    } else {
      // Default handling for other categories
      if (item.variants && item.variants.length > 1) {
        setNavState((prev) => ({ ...prev, view: "customizing" }));
      } else {
        addDirectToCart(item);
      }
    }
  }, []);

  const handleVariantSelect = useCallback(
    (variant: MenuItemVariant) => {
      if (!navState.selectedItem) return;

      console.log("📏 Selected variant:", variant.name);

      setNavState((prev) => ({
        ...prev,
        selectedVariant: variant,
      }));

      const item = navState.selectedItem;

      // Route based on category after variant selection
      if (item.category?.name === "Pizzas") {
        openPizzaCustomizer(item, variant);
      } else if (item.category?.name === "Appetizers") {
        openAppetizerCustomizer(item, variant);
      } else {
        // For other categories, add directly to cart with variant
        addDirectToCart(item, variant);
      }
    },
    [navState.selectedItem]
  );

  // ==========================================
  // CUSTOMIZER OPERATIONS
  // ==========================================

  const openPizzaCustomizer = useCallback((item: MenuItemWithVariants, variant?: MenuItemVariant) => {
    const cartItem = createCartItem(item, variant);
    setCustomizerItem(cartItem);
    setShowPizzaCustomizer(true);
  }, []);

  const openSandwichCustomizer = useCallback((item: MenuItemWithVariants) => {
    setNavState((prev) => ({ ...prev, selectedItem: item }));
    setShowSandwichCustomizer(true);
  }, []);

  const openAppetizerCustomizer = useCallback((item: MenuItemWithVariants, variant?: MenuItemVariant) => {
    setNavState((prev) => ({ ...prev, selectedItem: item, selectedVariant: variant || null }));
    setShowAppetizerCustomizer(true);
  }, []);

  const addDirectToCart = useCallback(
    (item: MenuItemWithVariants, variant?: MenuItemVariant) => {
      try {
        const cartItem = createCartItem(item, variant);
        console.log(`➕ Adding to cart: ${cartItem.displayName} - $${cartItem.totalPrice}`);
        onAddToCart(cartItem);

        // Return to category items view
        handleBackToCategoryItems();
      } catch (error) {
        console.error("Error adding item to cart:", error);
        alert("Error adding item to cart. Please try again.");
      }
    },
    [onAddToCart, handleBackToCategoryItems]
  );

  const createCartItem = useCallback((item: MenuItemWithVariants, variant?: MenuItemVariant): ConfiguredCartItem => {
    const basePrice = variant?.price ?? item.base_price;
    const displayName = variant?.name ? `${variant.name} ${item.name}` : item.name;

    return {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: variant?.id || null,
      variantName: variant?.name || null,
      quantity: 1,
      basePrice,
      selectedToppings: [],
      selectedModifiers: [],
      specialInstructions: "",
      totalPrice: basePrice,
      displayName,
    };
  }, []);

  // ==========================================
  // CUSTOMIZER COMPLETION HANDLERS
  // ==========================================

  const handlePizzaCustomizerComplete = useCallback(
    (updatedItem: ConfiguredCartItem) => {
      console.log("✅ Pizza customization completed");
      onAddToCart(updatedItem);
      setShowPizzaCustomizer(false);
      setCustomizerItem(null);
      handleBackToCategoryItems();
    },
    [onAddToCart, handleBackToCategoryItems]
  );

  const handleSandwichCustomizerComplete = useCallback(
    (updatedItem: ConfiguredCartItem) => {
      console.log("✅ Sandwich customization completed");
      onAddToCart(updatedItem);
      setShowSandwichCustomizer(false);
      handleBackToCategoryItems();
    },
    [onAddToCart, handleBackToCategoryItems]
  );

  const handleAppetizerCustomizerComplete = useCallback(
    (updatedItem: ConfiguredCartItem) => {
      console.log("✅ Appetizer customization completed");
      onAddToCart(updatedItem);
      setShowAppetizerCustomizer(false);
      handleBackToCategoryItems();
    },
    [onAddToCart, handleBackToCategoryItems]
  );

  const handleCustomizerCancel = useCallback(() => {
    setShowPizzaCustomizer(false);
    setShowSandwichCustomizer(false);
    setShowAppetizerCustomizer(false);
    setCustomizerItem(null);
    handleBackToCategoryItems();
  }, [handleBackToCategoryItems]);

  // ==========================================
  // RENDER LOGIC
  // ==========================================

  if (navState.view === "categories") {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Category</h3>
        <CategoryGrid categories={categorizedItems} onCategorySelect={handleCategorySelect} />
      </div>
    );
  }

  if (navState.view === "category-items") {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={handleBackToCategories} className="text-blue-600 hover:text-blue-800 font-medium">
            ← Categories
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {navState.selectedCategory?.name} ({currentCategoryItems.length})
          </h3>
        </div>

        <CategoryItemsGrid items={currentCategoryItems} onItemSelect={handleItemSelect} />
      </div>
    );
  }

  if (navState.view === "customizing" && navState.selectedItem) {
    // Show variant selector if needed
    if (navState.selectedItem.variants && navState.selectedItem.variants.length > 1 && !navState.selectedVariant) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={handleBackToCategoryItems} className="text-blue-600 hover:text-blue-800 font-medium">
              ← {navState.selectedCategory?.name}
            </button>
            <h3 className="text-lg font-semibold text-gray-900">Select Size for {navState.selectedItem.name}</h3>
          </div>

          <VariantSelector item={navState.selectedItem} onVariantSelect={handleVariantSelect} />
        </div>
      );
    }
  }

  return (
    <>
      {/* Default fallback */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
        <button onClick={handleBackToCategories} className="text-blue-600 hover:text-blue-800 font-medium mb-4">
          ← Back to Categories
        </button>
        <div className="text-center py-8">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>

      {/* CUSTOMIZER MODALS */}
      {showPizzaCustomizer && customizerItem && navState.selectedItem && (
        <ModalPizzaCustomizer
          item={customizerItem}
          menuItemWithVariants={navState.selectedItem}
          availableToppings={toppings}
          availableModifiers={modifiers}
          onComplete={handlePizzaCustomizerComplete}
          onCancel={handleCustomizerCancel}
          isOpen={showPizzaCustomizer}
        />
      )}

      {showSandwichCustomizer && navState.selectedItem && (
        <SandwichCustomizer
          item={navState.selectedItem}
          onComplete={handleSandwichCustomizerComplete}
          onCancel={handleCustomizerCancel}
          isOpen={showSandwichCustomizer}
        />
      )}

      {showAppetizerCustomizer && navState.selectedItem && (
        <AppetizerCustomizer
          item={navState.selectedItem}
          selectedVariant={navState.selectedVariant || undefined}
          onComplete={handleAppetizerCustomizerComplete}
          onCancel={handleCustomizerCancel}
          isOpen={showAppetizerCustomizer}
          restaurantId={restaurantId}
        />
      )}
    </>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

interface CategoryGridProps {
  categories: Array<{
    category: MenuCategory;
    items: MenuItemWithVariants[];
  }>;
  onCategorySelect: (category: MenuCategory) => void;
}

function CategoryGrid({ categories, onCategorySelect }: CategoryGridProps) {
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes("pizza")) return "🍕";
    if (name.includes("sandwich")) return "🥪";
    if (name.includes("appetizer")) return "🍗";
    if (name.includes("beverage") || name.includes("drink")) return "🥤";
    if (name.includes("side")) return "🍟";
    if (name.includes("dessert")) return "🍰";
    return "🍽️";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {categories.map(({ category, items }) => (
        <button
          key={category.id}
          onClick={() => onCategorySelect(category)}
          className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:border-blue-500 hover:shadow-md transition-all"
        >
          <div className="text-4xl mb-3">{getCategoryIcon(category.name)}</div>
          <div className="font-semibold text-gray-900 mb-1">{category.name}</div>
          <div className="text-sm text-gray-600">{items.length} items</div>
          {category.description && <div className="text-xs text-gray-500 mt-1">{category.description}</div>}
        </button>
      ))}
    </div>
  );
}

interface CategoryItemsGridProps {
  items: MenuItemWithVariants[];
  onItemSelect: (item: MenuItemWithVariants) => void;
}

function CategoryItemsGrid({ items, onItemSelect }: CategoryItemsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onSelect={() => onItemSelect(item)} />
      ))}
    </div>
  );
}

interface ItemCardProps {
  item: MenuItemWithVariants;
  onSelect: () => void;
}

function ItemCard({ item, onSelect }: ItemCardProps) {
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

  return (
    <button
      onClick={onSelect}
      className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all w-full"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900 mb-1">{item.name}</h5>
          {item.description && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>}
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{item.item_type}</span>
            <span className="text-gray-500">~{item.prep_time_minutes || 15} min</span>
            {hasVariants && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{item.variants.length} sizes</span>}
          </div>
        </div>

        <div className="text-right ml-4">
          <div className="text-lg font-bold text-green-600">{getPriceDisplay()}</div>
          <div className="text-xs text-blue-600 mt-1">{hasVariants ? "Choose Size" : "Add to Cart"}</div>
        </div>
      </div>
    </button>
  );
}

interface VariantSelectorProps {
  item: MenuItemWithVariants;
  onVariantSelect: (variant: MenuItemVariant) => void;
}

function VariantSelector({ item, onVariantSelect }: VariantSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {item.variants.map((variant) => (
        <button
          key={variant.id}
          onClick={() => onVariantSelect(variant)}
          className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-blue-500 hover:shadow-md transition-all"
        >
          <div className="font-semibold text-gray-900">{variant.name}</div>
          {variant.serves && <div className="text-sm text-gray-600">{variant.serves}</div>}
          <div className="text-lg font-bold text-green-600 mt-2">${variant.price.toFixed(2)}</div>
        </button>
      ))}
    </div>
  );
}

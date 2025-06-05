// src/components/features/orders/MenuNavigator.tsx - FIXED COMPONENT INTEGRATION
"use client";
import {
  ConfiguredCartItem,
  MenuCategory,
  MenuItemWithVariants,
} from "@/lib/types";
import { useCallback, useMemo, useState } from "react";
import AppetizerCustomizer from "./AppetizerCustomizer";
import PizzaCustomizer from "./PizzaCustomizer"; // ✅ FIXED: Correct import name
import SandwichCustomizer from "./SandwichCustomizer";
import ChickenCustomizer from "./ChickenCustomizer";

/**
 * 🎯 FIXED: MenuNavigator with corrected component integration
 *
 * Key Changes:
 * ✅ Fixed import: EnhancedPizzaCustomizer → PizzaCustomizer
 * ✅ Removed unused customizations prop
 * ✅ Updated component state names for consistency
 * ✅ Maintains compatibility with all other customizers
 */

interface MenuNavigatorProps {
  menuItems: MenuItemWithVariants[];
  // ❌ REMOVED: customizations: Customization[]; // Not needed - customizers load their own data
  onAddToCart: (configuredItem: ConfiguredCartItem) => void;
  restaurantId: string;
}

type NavigationView = "categories" | "category-items";

interface NavigationState {
  view: NavigationView;
  selectedCategory: MenuCategory | null;
}

export default function MenuNavigator({
  menuItems,
  onAddToCart,
  restaurantId,
}: MenuNavigatorProps) {
  // ==========================================
  // NAVIGATION STATE
  // ==========================================
  const [navState, setNavState] = useState<NavigationState>({
    view: "categories",
    selectedCategory: null,
  });

  // ==========================================
  // CUSTOMIZER STATES - FIXED NAMING
  // ==========================================
  const [showPizzaCustomizer, setShowPizzaCustomizer] = useState(false); // ✅ FIXED: Consistent naming
  const [showSandwichCustomizer, setShowSandwichCustomizer] = useState(false);
  const [showAppetizerCustomizer, setShowAppetizerCustomizer] = useState(false);
  const [showChickenCustomizer, setShowChickenCustomizer] = useState(false);

  const [selectedItem, setSelectedItem] = useState<MenuItemWithVariants | null>(
    null
  );
  const [customizerItem, setCustomizerItem] =
    useState<ConfiguredCartItem | null>(null);

  // ==========================================
  // DATA ORGANIZATION
  // ==========================================

  // Filter out stuffed pizzas from regular pizza category
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.category?.name === "Pizzas") {
        const hasStuffedVariants = item.variants?.some(
          (v) => v.crust_type === "stuffed"
        );
        const isStuffedPizza =
          item.name?.toLowerCase().includes("stuffed") ||
          item.item_type?.includes("stuffed");

        return !hasStuffedVariants && !isStuffedPizza;
      }

      return true;
    });
  }, [menuItems]);

  // Group items by category
  const categorizedItems = useMemo(() => {
    const categoryMap = new Map<
      string,
      {
        category: MenuCategory;
        items: MenuItemWithVariants[];
      }
    >();

    filteredMenuItems.forEach((item) => {
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

    return Array.from(categoryMap.values()).sort(
      (a, b) => a.category.sort_order - b.category.sort_order
    );
  }, [filteredMenuItems]);

  // Get items for currently selected category
  const currentCategoryItems = useMemo(() => {
    if (!navState.selectedCategory) return [];

    const categoryData = categorizedItems.find(
      (cat) => cat.category.id === navState.selectedCategory!.id
    );

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
    });
  }, []);

  const handleBackToCategories = useCallback(() => {
    console.log("← Back to categories");
    setNavState({
      view: "categories",
      selectedCategory: null,
    });
  }, []);

  const createCartItem = useCallback(
    (item: MenuItemWithVariants): ConfiguredCartItem => {
      const defaultVariant =
        item.variants && item.variants.length > 0 ? item.variants[0] : null;
      const basePrice = defaultVariant?.price ?? item.base_price;
      const displayName = item.name;

      return {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        menuItemId: item.id,
        menuItemName: item.name,
        variantId: defaultVariant?.id || null,
        variantName: defaultVariant?.name || null,
        quantity: 1,
        basePrice,
        selectedToppings: [],
        selectedModifiers: [],
        specialInstructions: "",
        totalPrice: basePrice,
        displayName,
      };
    },
    []
  );

  const addDirectToCart = useCallback(
    (item: MenuItemWithVariants) => {
      try {
        const cartItem = createCartItem(item);
        console.log(
          `➕ Adding to cart: ${cartItem.displayName} - $${cartItem.totalPrice}`
        );
        onAddToCart(cartItem);
      } catch (error) {
        console.error("Error adding item to cart:", error);
        alert("Error adding item to cart. Please try again.");
      }
    },
    [createCartItem, onAddToCart]
  );

  // ==========================================
  // CUSTOMIZER OPERATIONS - FIXED
  // ==========================================

  const closeAllCustomizers = useCallback(() => {
    setShowPizzaCustomizer(false); // ✅ FIXED: Consistent naming
    setShowSandwichCustomizer(false);
    setShowAppetizerCustomizer(false);
    setShowChickenCustomizer(false);
    setSelectedItem(null);
    setCustomizerItem(null);
  }, []);

  // ✅ FIXED: Pizza Customizer Handler
  const openPizzaCustomizer = useCallback(
    (item: MenuItemWithVariants) => {
      console.log("🍕 Opening pizza customizer for:", item.name);

      const cartItem = createCartItem(item);
      console.log("🍕 Created cart item for customizer:", cartItem);

      setCustomizerItem(cartItem);
      setSelectedItem(item);
      setShowPizzaCustomizer(true);
    },
    [createCartItem]
  );

  const openSandwichCustomizer = useCallback((item: MenuItemWithVariants) => {
    setSelectedItem(item);
    setShowSandwichCustomizer(true);
  }, []);

  const openAppetizerCustomizer = useCallback((item: MenuItemWithVariants) => {
    setSelectedItem(item);
    setShowAppetizerCustomizer(true);
  }, []);

  const openChickenCustomizer = useCallback((item: MenuItemWithVariants) => {
    console.log("🍗 Opening chicken customizer for:", item.name);
    setSelectedItem(item);
    setShowChickenCustomizer(true);
  }, []);

  const handleItemSelect = useCallback(
    (item: MenuItemWithVariants) => {
      console.log(
        "🍽️ Selected item:",
        item.name,
        "Category:",
        item.category?.name
      );

      setSelectedItem(item);

      const categoryName = item.category?.name;

      // 🎯 ROUTING LOGIC
      if (categoryName === "Pizzas" || categoryName === "Pizza") {
        console.log("🍕 Opening pizza customizer directly");
        openPizzaCustomizer(item); // ✅ FIXED: Consistent naming
      } else if (categoryName === "Sandwiches") {
        console.log("🥪 Opening sandwich customizer directly");
        openSandwichCustomizer(item);
      } else if (categoryName === "Appetizers") {
        console.log("🍗 Opening appetizer customizer directly");
        openAppetizerCustomizer(item);
      } else if (categoryName === "Chicken") {
        const itemName = item.name.toLowerCase();

        // Individual pieces go directly to cart
        if (
          itemName.includes("breast") ||
          itemName.includes("thigh") ||
          itemName.includes("leg") ||
          itemName.includes("wing")
        ) {
          console.log("🍗 Adding individual chicken piece directly to cart");
          addDirectToCart(item);
        } else {
          console.log("🍗 Opening chicken customizer for:", itemName);
          openChickenCustomizer(item);
        }
      } else if (categoryName === "Beverages" || categoryName === "Sides") {
        console.log("🥤 Adding simple item directly to cart");
        addDirectToCart(item);
      } else {
        console.log("❓ Unknown category, adding directly to cart");
        addDirectToCart(item);
      }
    },
    [
      openPizzaCustomizer, // ✅ FIXED: Consistent naming
      openSandwichCustomizer,
      openAppetizerCustomizer,
      openChickenCustomizer,
      addDirectToCart,
    ]
  );

  // ==========================================
  // CUSTOMIZER COMPLETION HANDLERS - FIXED
  // ==========================================

  // ✅ FIXED: Pizza Customizer Handler
  const handlePizzaCustomizerComplete = useCallback(
    (updatedItem: ConfiguredCartItem) => {
      console.log("✅ Pizza customization completed");
      onAddToCart(updatedItem);
      closeAllCustomizers();
    },
    [closeAllCustomizers, onAddToCart]
  );

  const handleSandwichCustomizerComplete = useCallback(
    (updatedItem: ConfiguredCartItem) => {
      console.log("✅ Sandwich customization completed");
      onAddToCart(updatedItem);
      closeAllCustomizers();
    },
    [closeAllCustomizers, onAddToCart]
  );

  const handleAppetizerCustomizerComplete = useCallback(
    (updatedItem: ConfiguredCartItem) => {
      console.log("✅ Appetizer customization completed");
      onAddToCart(updatedItem);
      closeAllCustomizers();
    },
    [closeAllCustomizers, onAddToCart]
  );

  const handleChickenCustomizerComplete = useCallback(
    (updatedItem: ConfiguredCartItem) => {
      console.log("✅ Chicken customization completed");
      onAddToCart(updatedItem);
      closeAllCustomizers();
    },
    [closeAllCustomizers, onAddToCart]
  );

  const handleCustomizerCancel = useCallback(() => {
    console.log("❌ Customization cancelled");
    closeAllCustomizers();
  }, [closeAllCustomizers]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      {/* MAIN CONTENT - Categories View */}
      {navState.view === "categories" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Menu Categories</h3>
            <p className="text-sm text-gray-600 mt-1">
              Choose a category to start ordering
            </p>
          </div>
          <div className="p-6">
            <CategoryGrid
              categories={categorizedItems}
              onCategorySelect={handleCategorySelect}
            />
          </div>
        </div>
      )}

      {/* MAIN CONTENT - Category Items View */}
      {navState.view === "category-items" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToCategories}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                ← Categories
              </button>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {navState.selectedCategory?.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {currentCategoryItems.length} items available
                  {navState.selectedCategory?.name === "Pizzas" &&
                    " (Stuffed pizzas in separate category)"}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <CategoryItemsGrid
              items={currentCategoryItems}
              onItemSelect={handleItemSelect}
            />
          </div>
        </div>
      )}

      {/* ✅ FIXED: PIZZA MODAL CUSTOMIZER */}
      {showPizzaCustomizer && customizerItem && (
        <PizzaCustomizer
          item={customizerItem}
          onComplete={handlePizzaCustomizerComplete}
          onCancel={handleCustomizerCancel}
          isOpen={showPizzaCustomizer}
          restaurantId={restaurantId}
        />
      )}

      {/* OTHER CUSTOMIZERS (unchanged) */}
      {showSandwichCustomizer && selectedItem && (
        <SandwichCustomizer
          item={selectedItem}
          onComplete={handleSandwichCustomizerComplete}
          onCancel={handleCustomizerCancel}
          isOpen={showSandwichCustomizer}
        />
      )}

      {showAppetizerCustomizer && selectedItem && (
        <AppetizerCustomizer
          item={selectedItem}
          onComplete={handleAppetizerCustomizerComplete}
          onCancel={handleCustomizerCancel}
          isOpen={showAppetizerCustomizer}
          restaurantId={restaurantId}
        />
      )}

      {showChickenCustomizer && selectedItem && (
        <ChickenCustomizer
          item={selectedItem}
          onComplete={handleChickenCustomizerComplete}
          onCancel={handleCustomizerCancel}
          isOpen={showChickenCustomizer}
          restaurantId={restaurantId}
        />
      )}
    </>
  );
}

// ==========================================
// SUB-COMPONENTS (Same as before)
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
    if (name.includes("chicken")) return "🍗";
    if (name.includes("pasta")) return "🍝";
    if (name.includes("beverage") || name.includes("drink")) return "🥤";
    if (name.includes("side")) return "🍟";
    if (name.includes("stuffed")) return "🥧";
    if (name.includes("dessert")) return "🍰";
    return "🍽️";
  };

  const getCategoryDescription = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes("pizza") && !name.includes("stuffed"))
      return "Customizable thin & double dough pizzas";
    if (name.includes("stuffed")) return "Deep-dish stuffed pizzas";
    if (name.includes("sandwich")) return "Build your perfect sandwich";
    if (name.includes("appetizer")) return "Wings, mozzarella sticks & more";
    if (name.includes("chicken")) return "Family packs & chicken dinners";
    if (name.includes("pasta")) return "Italian favorites with sauce options";
    if (name.includes("beverage")) return "Sodas, juices & beverages";
    if (name.includes("side")) return "Fries, breadsticks & extras";
    return "Delicious menu items";
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map(({ category, items }) => (
        <button
          key={category.id}
          onClick={() => onCategorySelect(category)}
          className="bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300 rounded-xl p-6 text-center transition-all duration-200 hover:shadow-md"
        >
          <div className="text-5xl mb-3">{getCategoryIcon(category.name)}</div>
          <div className="font-bold text-gray-900 mb-2 text-lg">
            {category.name}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {getCategoryDescription(category.name)}
          </div>
          <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block">
            {items.length} items
          </div>
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
    <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onSelect={() => onItemSelect(item)}
        />
      ))}
    </div>
  );
}

interface ItemCardProps {
  item: MenuItemWithVariants;
  onSelect: () => void;
}

function ItemCard({ item, onSelect }: ItemCardProps) {
  return (
    <button
      onClick={onSelect}
      className="bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 rounded-lg p-3 text-left transition-all duration-200 hover:shadow-md w-full"
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h5 className="font-bold text-gray-900 text-base">{item.name}</h5>
          <div className="text-xs text-gray-500 mt-1">
            ~{item.prep_time_minutes || 15} min
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="text-lg font-bold text-green-600">
            ${(item.base_price || 0).toFixed(2)}
          </div>
        </div>
      </div>
    </button>
  );
}

// src/lib/contexts/menu-context.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { MenuCategory, MenuItemWithCategory } from "@/lib/types";

// Create the context
export const MenuContext = createContext<{
  categories: MenuCategory[];
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  menuItems: MenuItemWithCategory[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}>({
  categories: [],
  selectedCategory: null,
  setSelectedCategory: () => {},
  menuItems: [],
  loading: false,
  error: null,
  refreshData: async () => {},
});

// Provider component
export function MenuContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<
    MenuItemWithCategory[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track initialization
  const initialLoadComplete = useRef(false);

  // Function to fetch all data with robust error handling
  // CRITICAL CHANGE: Remove selectedCategory from dependency array
  const fetchData = useCallback(async () => {
    try {
      console.log("Menu context: Fetching data...");
      setLoading(true);
      setError(null);

      // Fetch categories with error handling
      let fetchedCategories: MenuCategory[] = [];
      try {
        const categoriesResponse = await fetch("/api/admin/menu/categories");
        if (!categoriesResponse.ok) {
          throw new Error(
            `Failed to fetch categories: ${categoriesResponse.status}`
          );
        }
        const categoriesData = await categoriesResponse.json();
        fetchedCategories = categoriesData.data || [];
        setCategories(fetchedCategories);
        console.log(
          `Menu context: Loaded ${fetchedCategories.length} categories`
        );
      } catch (categoryError) {
        console.error("Error fetching categories:", categoryError);
        // Continue with other requests even if categories fail
      }

      // Fetch all menu items with error handling
      try {
        const menuItemsResponse = await fetch("/api/admin/menu/items");
        if (!menuItemsResponse.ok) {
          throw new Error(
            `Failed to fetch menu items: ${menuItemsResponse.status}`
          );
        }
        const menuItemsData = await menuItemsResponse.json();
        const items = menuItemsData.data || [];
        setAllMenuItems(items);
        console.log(`Menu context: Loaded ${items.length} menu items`);
      } catch (itemsError) {
        console.error("Error fetching menu items:", itemsError);
        setError("Failed to load menu items. Please try again.");
      }
    } catch (err) {
      console.error("Error in menu context data loading:", err);
      setError(err instanceof Error ? err.message : "Failed to load menu data");
    } finally {
      setLoading(false);
    }
  }, []); // REMOVE selectedCategory from dependencies

  // Initial data fetch only once
  useEffect(() => {
    if (!initialLoadComplete.current) {
      console.log("Initial load effect running");
      fetchData();
      initialLoadComplete.current = true;
    }
  }, [fetchData]);

  // Set initial selected category once categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      console.log("Setting initial category:", categories[0].id);
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  // Filter items when selected category changes or items change
  useEffect(() => {
    console.log("FILTERING EFFECT RUN, selectedCategory:", selectedCategory);
    console.log("ALL MENU ITEMS:", allMenuItems);

    if (selectedCategory) {
      const filtered = allMenuItems.filter(
        (item) => item.category_id === selectedCategory
      );
      console.log(
        `Menu context: Filtered to ${filtered.length} items for category ${selectedCategory}`
      );
      setFilteredMenuItems(filtered);
    } else {
      setFilteredMenuItems(allMenuItems);
    }

    console.log("FILTERED MENU ITEMS:", filteredMenuItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, allMenuItems]);

  const contextValue = {
    categories,
    selectedCategory,
    setSelectedCategory,
    menuItems: filteredMenuItems,
    loading,
    error,
    refreshData: fetchData,
  };

  return (
    <MenuContext.Provider value={contextValue}>{children}</MenuContext.Provider>
  );
}

// Custom hook to use the context
export function useMenuContext() {
  return useContext(MenuContext);
}

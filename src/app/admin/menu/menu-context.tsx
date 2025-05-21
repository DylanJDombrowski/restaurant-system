// src/app/admin/menu/menu-context.tsx (updated version)
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

  // Function to fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching categories and menu items...");

      // Fetch categories
      const categoriesResponse = await fetch("/api/admin/menu/categories");
      if (!categoriesResponse.ok) {
        throw new Error(
          `Failed to fetch categories: ${categoriesResponse.status}`
        );
      }
      const categoriesData = await categoriesResponse.json();
      const fetchedCategories = categoriesData.data || [];
      setCategories(fetchedCategories);

      // Set initial selected category if none selected
      if (fetchedCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(fetchedCategories[0].id);
      }

      // Fetch all menu items
      const menuItemsResponse = await fetch("/api/admin/menu/items");
      if (!menuItemsResponse.ok) {
        throw new Error(
          `Failed to fetch menu items: ${menuItemsResponse.status}`
        );
      }
      const menuItemsData = await menuItemsResponse.json();
      setAllMenuItems(menuItemsData.data || []);

      console.log("Data fetched successfully:", {
        categories: fetchedCategories.length,
        items: menuItemsData.data?.length || 0,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  // Fetch data on initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter items when selected category changes
  useEffect(() => {
    if (selectedCategory) {
      setFilteredMenuItems(
        allMenuItems.filter((item) => item.category_id === selectedCategory)
      );
    } else {
      setFilteredMenuItems(allMenuItems);
    }
  }, [selectedCategory, allMenuItems]);

  return (
    <MenuContext.Provider
      value={{
        categories,
        selectedCategory,
        setSelectedCategory,
        menuItems: filteredMenuItems,
        loading,
        error,
        refreshData: fetchData,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

// Custom hook to use the context
export function useMenuContext() {
  return useContext(MenuContext);
}

// src/app/admin/menu/menu-context.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { MenuCategory, MenuItemWithCategory } from "@/lib/types";

// Create the context
export const MenuContext = createContext<{
  categories: MenuCategory[];
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  menuItems: MenuItemWithCategory[];
  loading: boolean;
}>({
  categories: [],
  selectedCategory: null,
  setSelectedCategory: () => {},
  menuItems: [],
  loading: false,
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

  // Fetch all categories and menu items once
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

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

        // Fetch all menu items
        const menuItemsResponse = await fetch("/api/admin/menu/items");
        if (!menuItemsResponse.ok) {
          throw new Error(
            `Failed to fetch menu items: ${menuItemsResponse.status}`
          );
        }
        const menuItemsData = await menuItemsResponse.json();
        setAllMenuItems(menuItemsData.data || []);

        // Set initial selected category if none selected
        if (fetchedCategories.length > 0 && !selectedCategory) {
          setSelectedCategory(fetchedCategories[0].id);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedCategory]);

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

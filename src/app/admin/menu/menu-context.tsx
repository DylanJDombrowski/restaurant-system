// src/app/admin/menu/menu-context.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { MenuCategory } from "@/lib/types";

// Create the context
export const MenuContext = createContext<{
  categories: MenuCategory[];
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  loading: boolean;
}>({
  categories: [],
  selectedCategory: null,
  setSelectedCategory: () => {},
  loading: false,
});

// Provider component
export function MenuContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/menu/categories");
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }
        const data = await response.json();
        const fetchedCategories = data.data || [];
        setCategories(fetchedCategories);

        // Set initial selected category if none selected
        if (fetchedCategories.length > 0 && !selectedCategory) {
          setSelectedCategory(fetchedCategories[0].id);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [selectedCategory]);

  return (
    <MenuContext.Provider
      value={{
        categories,
        selectedCategory,
        setSelectedCategory,
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

// src/app/admin/menu/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";

export default function MenuManagement() {
  const { restaurant } = useAuth();
  type Category = { id: string | number; name: string };
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<
    string | number | null
  >(null);

  type MenuItem = {
    id: string | number;
    name: string;
    description?: string;
    item_type?: string;
    base_price?: number;
    // Add other fields as needed
  };

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/menu/categories?restaurant_id=${restaurant?.id}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }

      const data = await response.json();
      setCategories(data.data || []);

      if (data.data && data.data.length > 0 && !selectedCategory) {
        setSelectedCategory(data.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load categories"
      );
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id, selectedCategory]);

  const fetchMenuItems = useCallback(
    async (categoryId: string | number) => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/menu?restaurant_id=${restaurant?.id}&category_id=${categoryId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch menu items: ${response.status}`);
        }

        const data = await response.json();
        setMenuItems(data.data || []);
      } catch (err) {
        console.error("Error fetching menu items:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load menu items"
        );
      } finally {
        setLoading(false);
      }
    },
    [restaurant?.id]
  );

  useEffect(() => {
    if (restaurant) {
      fetchCategories();
    }
  }, [fetchCategories, restaurant]);

  useEffect(() => {
    if (selectedCategory) {
      fetchMenuItems(selectedCategory);
    }
  }, [fetchMenuItems, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
        <div className="space-x-2">
          <Link
            href="/admin/menu/item/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add New Item
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-2 p-2 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategory === category.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">Loading menu items...</div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items in this category yet.
              </div>
            ) : (
              <div className="space-y-4">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {item.item_type}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            ${item.base_price}
                          </span>
                        </div>
                      </div>
                      <div className="space-x-2">
                        <Link
                          href={`/admin/menu/item/${item.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/menu/item/${item.id}/variants`}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          Variants
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

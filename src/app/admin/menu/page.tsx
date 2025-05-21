// src/app/admin/menu/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MenuItemWithCategory } from "@/lib/types";
import { useMenuContext } from "@/lib/contexts/menu-context";

export default function MenuManagement() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    loading: categoryLoading,
  } = useMenuContext();
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch menu items when selected category changes
  useEffect(() => {
    async function fetchMenuItems() {
      if (!selectedCategory) return;

      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/menu/items?category_id=${selectedCategory}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch menu items: ${response.status}`);
        }

        const data = await response.json();
        setMenuItems(data.data || []);
      } catch (err) {
        console.error("Error fetching menu items:", err);
        setError(
          err instanceof Error ? err.message : "Error loading menu items"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchMenuItems();
  }, [selectedCategory]);

  // Function to delete menu item
  async function deleteMenuItem(itemId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this menu item? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/menu/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete item: ${response.status}`);
      }

      // Remove from UI
      setMenuItems((items) => items.filter((item) => item.id !== itemId));
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item. Please try again.");
    }
  }

  // Function to toggle item availability
  async function toggleItemAvailability(
    itemId: string,
    currentStatus: boolean
  ) {
    try {
      const response = await fetch(`/api/admin/menu/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_available: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update item availability: ${response.status}`
        );
      }

      // Update in UI
      setMenuItems((items) =>
        items.map((item) => {
          if (item.id === itemId) {
            return { ...item, is_available: !currentStatus };
          }
          return item;
        })
      );
    } catch (err) {
      console.error("Error updating item:", err);
      alert("Failed to update item availability. Please try again.");
    }
  }

  // Get a friendly label for item types
  function getItemTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      pizza: "Pizza",
      sandwich: "Sandwich",
      chicken_meal: "Chicken Meal",
      chicken_piece: "Chicken Piece",
      appetizer: "Appetizer",
      side: "Side",
      beverage: "Beverage",
    };
    return typeMap[type] || type;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded my-4">
        <h3 className="font-bold">Error Loading Menu</h3>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 border-b border-stone-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-stone-950">Menu Items</h2>

          {/* Add Category Selector */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-sm rounded-full ${
                selectedCategory === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 border-b border-stone-200">
        <h2 className="text-lg font-semibold text-stone-950">Menu Items</h2>
      </div>

      {loading || categoryLoading ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex justify-between items-start border rounded-lg p-4"
            >
              <div className="space-y-2 flex-1">
                <div className="h-6 w-48 animate-pulse bg-gray-200 rounded"></div>
                <div className="h-4 w-64 animate-pulse bg-gray-200 rounded"></div>
                <div className="flex gap-2 mt-1">
                  <div className="h-5 w-16 animate-pulse bg-gray-200 rounded"></div>
                  <div className="h-5 w-16 animate-pulse bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="h-6 w-20 animate-pulse bg-gray-200 rounded"></div>
                <div className="h-8 w-24 animate-pulse bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : menuItems.length === 0 ? (
        <div className="p-8 text-center text-stone-950">
          <p>No menu items found in this category.</p>
          <Link
            href="/admin/menu/item/new"
            className="text-blue-600 underline mt-2 inline-block"
          >
            Add your first item
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-950 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-950 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-950 uppercase tracking-wider">
                  Base Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-950 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-stone-950 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-950">
              {menuItems.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-stone-900">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-sm text-stone-950 truncate max-w-md">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getItemTypeLabel(item.item_type || "unknown")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${item.base_price?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() =>
                        toggleItemAvailability(item.id, item.is_available)
                      }
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.is_available
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/admin/menu/item/${item.id}/variants`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Variants
                    </Link>
                    <Link
                      href={`/admin/menu/item/${item.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteMenuItem(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

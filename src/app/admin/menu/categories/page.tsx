// Create src/app/admin/menu/categories/page.tsx
"use client";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";
import { MenuCategory } from "@/lib/types";
import { useEffect, useState } from "react";

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Partial<MenuCategory> | null>(null);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/menu/categories");
        if (!response.ok) {
          throw new Error("Failed to load categories");
        }
        const data = await response.json();
        setCategories(data.data || []);
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Save category handler
  const handleSaveCategory = async () => {
    if (!editingCategory || !editingCategory.name) return;

    try {
      const isEditing = !!editingCategory.id;
      const method = isEditing ? "PATCH" : "POST";
      const url = isEditing ? `/api/admin/menu/categories/${editingCategory.id}` : "/api/admin/menu/categories";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingCategory),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? "update" : "create"} category`);
      }

      // Refresh categories
      const categoriesResponse = await fetch("/api/admin/menu/categories");
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData.data || []);

      // Reset form
      setEditingCategory(null);
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/menu/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete category");
      }

      // Update the UI by removing the deleted category
      setCategories(categories.filter((category) => category.id !== categoryId));
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <div>
      <div className="p-4 border-b border-stone-200">
        <h2 className="text-lg font-semibold text-stone-950">Menu Categories</h2>
      </div>

      <div className="p-4">
        <button
          onClick={() =>
            setEditingCategory({
              name: "",
              sort_order: categories.length * 10,
              is_active: true,
            })
          }
          className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-6"
        >
          Add New Category
        </button>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-950 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-950 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-950 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-stone-950 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 whitespace-nowrap text-stone-950">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-stone-950">{category.sort_order}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        category.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setEditingCategory(category)} className="text-blue-600 hover:text-blue-900 mr-4">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteCategory(category.id)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-xl font-semibold">{editingCategory.id ? "Edit Category" : "Add New Category"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">
                  Category Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.name || ""}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                    })
                  }
                  className="w-full border border-stone-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">Description</label>
                <textarea
                  value={editingCategory.description || ""}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      description: e.target.value,
                    })
                  }
                  className="w-full border border-stone-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editingCategory.sort_order || 0}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      sort_order: parseInt(e.target.value),
                    })
                  }
                  className="w-full border border-stone-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingCategory.is_active !== false}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      is_active: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 border-stone-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-stone-950">
                  Category is active
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-stone-50 flex justify-end space-x-2 rounded-b-lg">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 border border-stone-300 rounded-md text-stone-950 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button onClick={handleSaveCategory} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

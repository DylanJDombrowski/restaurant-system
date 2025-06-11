// src/app/admin/menu/item/[id]/variants/page.tsx
"use client";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";
import { MenuItem, MenuItemVariant } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface VariantFormData {
  id?: string;
  name: string;
  size_code?: string; // Small, Medium, Large
  price: number;
  serves?: string; // Serves 1-2, etc.
  crust_type?: string; // For pizzas
  sort_order: number;
  is_available: boolean;
  prep_time_minutes?: number;
}

export default function VariantManagement() {
  const params = useParams();
  const itemId = params?.id as string;

  // State
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [variants, setVariants] = useState<MenuItemVariant[]>([]);
  const [editingVariant, setEditingVariant] = useState<VariantFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load menu item and its variants
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch menu item
        const itemResponse = await fetch(`/api/admin/menu/items/${itemId}`);
        if (!itemResponse.ok) {
          throw new Error("Failed to load menu item");
        }
        const itemData = await itemResponse.json();
        setMenuItem(itemData.data);

        // Fetch variants
        const variantsResponse = await fetch(`/api/admin/menu/items/${itemId}/variants`);
        if (!variantsResponse.ok) {
          throw new Error("Failed to load variants");
        }
        const variantsData = await variantsResponse.json();
        setVariants(variantsData.data || []);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [itemId]);

  // Start creating a new variant
  const handleAddVariant = () => {
    // Set next sort order to be after the last one
    const nextSortOrder = variants.length > 0 ? Math.max(...variants.map((v) => v.sort_order || 0)) + 10 : 10;

    setEditingVariant({
      name: "",
      price: menuItem?.base_price || 0,
      sort_order: nextSortOrder,
      is_available: true,
      prep_time_minutes: menuItem?.prep_time_minutes,
    });
  };

  // Start editing an existing variant
  const handleEditVariant = (variant: MenuItemVariant) => {
    setEditingVariant({
      id: variant.id,
      name: variant.name,
      size_code: variant.size_code,
      price: variant.price,
      serves: variant.serves,
      crust_type: variant.crust_type,
      sort_order: variant.sort_order,
      is_available: variant.is_available,
      prep_time_minutes: variant.prep_time_minutes,
    });
  };

  // Delete a variant
  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Are you sure you want to delete this variant?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/menu/variants/${variantId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete variant");
      }

      // Remove from UI
      setVariants(variants.filter((v) => v.id !== variantId));
    } catch (err) {
      console.error("Error deleting variant:", err);
      alert("Failed to delete variant");
    }
  };

  // Update variant form field
  const handleVariantInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingVariant) return;

    const { name, value, type } = e.target;

    setEditingVariant({
      ...editingVariant,
      [name]: type === "number" ? parseFloat(value) || 0 : type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  // Save variant (create or update)
  const handleSaveVariant = async () => {
    if (!editingVariant) return;

    try {
      const isEdit = !!editingVariant.id;
      const method = isEdit ? "PATCH" : "POST";
      const url = isEdit ? `/api/admin/menu/variants/${editingVariant.id}` : `/api/admin/menu/items/${itemId}/variants`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editingVariant,
          menu_item_id: itemId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? "update" : "create"} variant`);
      }

      const resultData = await response.json();

      // Update UI
      if (isEdit) {
        setVariants(variants.map((v) => (v.id === editingVariant.id ? resultData.data : v)));
      } else {
        setVariants([...variants, resultData.data]);
      }

      // Close the form
      setEditingVariant(null);
    } catch (err) {
      console.error("Error saving variant:", err);
      alert("Failed to save variant");
    }
  };

  // Cancel variant editing
  const handleCancelVariant = () => {
    setEditingVariant(null);
  };

  // Helper function to get type-specific fields
  const getVariantTypeFields = () => {
    if (!menuItem || !editingVariant) return null;

    switch (menuItem.item_type) {
      case "pizza":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size Code</label>
              <select
                name="size_code"
                value={editingVariant.size_code || ""}
                onChange={handleVariantInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Size</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="Extra Large">Extra Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crust Type</label>
              <select
                name="crust_type"
                value={editingVariant.crust_type || ""}
                onChange={handleVariantInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Crust</option>
                <option value="Thin">Thin</option>
                <option value="Hand-Tossed">Hand-Tossed</option>
                <option value="Double Dough">Double Dough</option>
                <option value="Deep Dish">Deep Dish</option>
              </select>
            </div>
          </>
        );

      case "chicken_meal":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Piece Count</label>
              <select
                name="size_code"
                value={editingVariant.size_code || ""}
                onChange={handleVariantInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Size</option>
                <option value="8pc">8 Pieces</option>
                <option value="12pc">12 Pieces</option>
                <option value="16pc">16 Pieces</option>
                <option value="20pc">20 Pieces</option>
                <option value="25pc">25 Pieces</option>
                <option value="30pc">30 Pieces</option>
                <option value="40pc">40 Pieces</option>
                <option value="50pc">50 Pieces</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                name="crust_type" // Reusing this field for meal type
                value={editingVariant.crust_type || ""}
                onChange={handleVariantInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Regular Meal</option>
                <option value="Family">Family Meal</option>
                <option value="Bulk">Bulk Only</option>
              </select>
            </div>
          </>
        );

      case "appetizer":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size/Count</label>
            <input
              type="text"
              name="size_code"
              placeholder="e.g., 6pc, 12pc, 1lb"
              value={editingVariant.size_code || ""}
              onChange={handleVariantInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    <AuthLoadingScreen />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded my-4">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 bg-red-600 text-white px-4 py-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Variants</h1>
          <p className="text-gray-600">
            {menuItem?.name} - {menuItem?.item_type}
          </p>
        </div>
        <div className="space-x-2">
          <button onClick={handleAddVariant} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Add Variant
          </button>
          <Link href="/admin/menu" className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Back to Menu
          </Link>
        </div>
      </div>

      {/* Variant Editor Modal */}
      {editingVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">{editingVariant.id ? "Edit Variant" : "Add Variant"}</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variant Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder='e.g., Small 10" Thin Crust'
                  value={editingVariant.name}
                  onChange={handleVariantInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                    value={editingVariant.price}
                    onChange={handleVariantInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pl-7"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type-specific fields */}
                {getVariantTypeFields()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serves</label>
                <input
                  type="text"
                  name="serves"
                  placeholder="e.g., Serves 2-3"
                  value={editingVariant.serves || ""}
                  onChange={handleVariantInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    name="sort_order"
                    value={editingVariant.sort_order}
                    onChange={handleVariantInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (minutes)</label>
                  <input
                    type="number"
                    name="prep_time_minutes"
                    value={editingVariant.prep_time_minutes || ""}
                    onChange={handleVariantInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_available"
                  name="is_available"
                  checked={editingVariant.is_available}
                  onChange={handleVariantInputChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                  Variant is available for ordering
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
              <button
                type="button"
                onClick={handleCancelVariant}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button type="button" onClick={handleSaveVariant} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Save Variant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variants List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Size/Variant Options</h2>
          <p className="text-sm text-gray-600 mt-1">Add different sizes or variants with their specific prices.</p>
        </div>

        {variants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No variants added yet.</p>
            <button onClick={handleAddVariant} className="text-blue-600 underline mt-2">
              Add your first variant
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size/Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {variants
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map((variant) => (
                    <tr key={variant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{variant.name}</div>
                        {variant.serves && <div className="text-sm text-gray-500">{variant.serves}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{variant.size_code || variant.crust_type || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${variant.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            variant.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {variant.is_available ? "Available" : "Unavailable"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onClick={() => handleEditVariant(variant)} className="text-blue-600 hover:text-blue-900">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteVariant(variant.id)} className="text-red-600 hover:text-red-900">
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
    </div>
  );
}

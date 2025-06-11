// src/app/admin/menu/item/[id]/page.tsx (also works for /new)
"use client";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { MenuCategory } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Define the form data structure with all possible fields
interface MenuItemFormData {
  name: string;
  description: string;
  category_id: string;
  item_type: string;
  base_price: number;
  prep_time_minutes: number;
  is_available: boolean;
  allows_custom_toppings: boolean;
  default_toppings_json?: Record<string, unknown>;
  image_url?: string;
}

export default function MenuItemForm() {
  const router = useRouter();
  const params = useParams();
  const isEdit = params?.id !== "new";
  const itemId = params?.id as string;

  // Form state
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: "",
    description: "",
    category_id: "",
    item_type: "pizza", // Default value
    base_price: 0,
    prep_time_minutes: 15, // Default value
    is_available: true,
    allows_custom_toppings: false,
  });

  // UI state
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories and item data if editing
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch categories
        const categoriesResponse = await fetch("/api/admin/menu/categories");
        if (!categoriesResponse.ok) {
          throw new Error("Failed to load categories");
        }
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.data || []);

        // If editing, fetch item data
        if (isEdit && itemId) {
          const itemResponse = await fetch(`/api/admin/menu/items/${itemId}`);
          if (!itemResponse.ok) {
            throw new Error("Failed to load menu item");
          }
          const itemData = await itemResponse.json();

          if (itemData.data) {
            setFormData({
              name: itemData.data.name || "",
              description: itemData.data.description || "",
              category_id: itemData.data.category_id || "",
              item_type: itemData.data.item_type || "pizza",
              base_price: itemData.data.base_price || 0,
              prep_time_minutes: itemData.data.prep_time_minutes || 15,
              is_available: itemData.data.is_available !== false, // Default to true
              allows_custom_toppings:
                itemData.data.allows_custom_toppings || false,
              default_toppings_json: itemData.data.default_toppings_json,
              image_url: itemData.data.image_url,
            });
          }
        }
      } catch (err) {
        console.error("Error loading form data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load form data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isEdit, itemId]);

  // Update form data
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    // Handle different input types
    if (type === "number") {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0,
      });
    } else if (type === "checkbox") {
      setFormData({
        ...formData,
        // Need to cast to access checked property
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      // Prepare API call based on whether we're creating or editing
      const method = isEdit ? "PATCH" : "POST";
      const url = isEdit
        ? `/api/admin/menu/items/${itemId}`
        : "/api/admin/menu/items";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${isEdit ? "update" : "create"} menu item`
        );
      }

      const result = await response.json();

      // Redirect to the variants page if this is a new item with variants
      if (
        !isEdit &&
        (formData.item_type === "pizza" ||
          formData.item_type === "appetizer" ||
          formData.item_type === "chicken_meal")
      ) {
        router.push(`/admin/menu/item/${result.data.id}/variants`);
        return;
      }

      // Otherwise go back to menu management
      router.push("/admin/menu");
    } catch (err) {
      console.error("Error submitting form:", err);
      setError(err instanceof Error ? err.message : "Failed to save menu item");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? "Edit Menu Item" : "Add New Menu Item"}
        </h1>
        <Link
          href="/admin/menu"
          className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-stone-850"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-stone-400">
          <h2 className="text-lg font-semibold text-gray-900">
            Basic Information
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full border border-stone-400 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Category <span className="text-red-600">*</span>
              </label>
              <select
                name="category_id"
                required
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full border border-stone-400 rounded-md px-3 py-2"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full border border-stone-400 rounded-md px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Item Type <span className="text-red-600">*</span>
              </label>
              <select
                name="item_type"
                required
                value={formData.item_type}
                onChange={handleInputChange}
                className="w-full border border-stone-400 rounded-md px-3 py-2"
              >
                <option value="pizza">Pizza</option>
                <option value="sandwich">Sandwich</option>
                <option value="chicken_meal">Chicken Meal</option>
                <option value="chicken_piece">Chicken Piece</option>
                <option value="appetizer">Appetizer</option>
                <option value="side">Side</option>
                <option value="beverage">Beverage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Base Price <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-900">$</span>
                </div>
                <input
                  type="number"
                  name="base_price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.base_price}
                  onChange={handleInputChange}
                  className="w-full border border-stone-400 rounded-md px-3 py-2 pl-7"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Prep Time (minutes)
              </label>
              <input
                type="number"
                name="prep_time_minutes"
                min="1"
                value={formData.prep_time_minutes}
                onChange={handleInputChange}
                className="w-full border border-stone-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_available"
                name="is_available"
                checked={formData.is_available}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 border-stone-400 rounded"
              />
              <label
                htmlFor="is_available"
                className="ml-2 text-sm text-gray-900"
              >
                Item is available for ordering
              </label>
            </div>

            {(formData.item_type === "pizza" ||
              formData.item_type === "sandwich") && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allows_custom_toppings"
                  name="allows_custom_toppings"
                  checked={formData.allows_custom_toppings}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 border-stone-950 rounded"
                />
                <label
                  htmlFor="allows_custom_toppings"
                  className="ml-2 text-sm text-gray-900"
                >
                  Allows customization
                </label>
              </div>
            )}
          </div>

          {/* Item type specific fields */}
          {formData.item_type === "pizza" && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-2">
                Pizza Options
              </h3>
              <p className="text-sm text-gray-900 mb-4">
                After saving, you&apos;ll be able to add size variants and set
                up default toppings.
              </p>
            </div>
          )}

          {formData.item_type === "sandwich" && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-2">
                Sandwich Options
              </h3>
              <p className="text-sm text-gray-900 mb-4">
                After saving, you can configure bread types and sandwich
                toppings.
              </p>
            </div>
          )}

          {formData.item_type === "chicken_meal" && (
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-2">
                Chicken Meal Options
              </h3>
              <p className="text-sm text-gray-900 mb-4">
                After saving, you&apos;ll need to add size variants (like 8pc,
                12pc, etc.)
              </p>
            </div>
          )}

          {formData.item_type === "appetizer" && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-2">
                Appetizer Options
              </h3>
              <p className="text-sm text-gray-900 mb-4">
                For appetizers with multiple sizes (like 6pc, 12pc), add size
                variants after saving.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end rounded-b-lg">
          <button
            type="submit"
            disabled={submitting}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
              submitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {submitting
              ? "Saving..."
              : isEdit
              ? "Update Menu Item"
              : "Create Menu Item"}
          </button>
        </div>
      </form>
    </div>
  );
}

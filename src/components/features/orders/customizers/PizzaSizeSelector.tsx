"use client";
import { PizzaMenuResponse } from "@/lib/types";
import { useMemo } from "react";

interface PizzaSizeSelectorProps {
  availableSizes: string[];
  selectedSize: string;
  onSizeSelect: (size: string) => void;
  pizzaMenuData: PizzaMenuResponse | null;
  menuItemId: string;
  isLoading?: boolean;
  className?: string;
}

export function PizzaSizeSelector({
  availableSizes,
  selectedSize,
  onSizeSelect,
  pizzaMenuData,
  menuItemId,
  isLoading = false,
  className = "",
}: PizzaSizeSelectorProps) {
  // Get minimum price for each size (extracted from PizzaCustomizer logic)
  const getMinPriceForSize = useMemo(() => {
    return (sizeCode: string): number => {
      if (!pizzaMenuData) return 0;

      // Check if this is a specialty pizza first
      const template = pizzaMenuData.pizza_templates.find((t) => t.menu_item_id === menuItemId);

      if (template) {
        // Specialty pizza - use variant price
        const specialtyItem = pizzaMenuData.pizza_items.find((item) => item.id === menuItemId);
        if (specialtyItem) {
          const variant = specialtyItem.variants.find((v) => v.size_code === sizeCode && v.crust_type === "thin");
          if (variant) {
            return variant.price;
          }
        }
      }

      // Regular pizza - use crust pricing (find cheapest option for this size)
      const sizePrices = pizzaMenuData.crust_pricing
        .filter((cp) => {
          const matchesSize =
            cp.size_code === sizeCode ||
            (sizeCode === "medium" && cp.size_code === "12in") ||
            (sizeCode === "small" && cp.size_code === "10in") ||
            (sizeCode === "large" && cp.size_code === "14in") ||
            (sizeCode === "xlarge" && cp.size_code === "16in");

          return matchesSize && cp.crust_type !== "stuffed";
        })
        .map((cp) => cp.base_price);

      return sizePrices.length > 0 ? Math.min(...sizePrices) : 0;
    };
  }, [pizzaMenuData, menuItemId]);

  const getSizeDisplayName = (sizeCode: string): string => {
    const sizeNames: Record<string, string> = {
      small: 'Small 10"',
      medium: 'Medium 12"',
      large: 'Large 14"',
      xlarge: 'X-Large 16"',
      "10in": 'Small 10"',
      "12in": 'Medium 12"',
      "14in": 'Large 14"',
      "16in": 'X-Large 16"',
    };
    return sizeNames[sizeCode] || sizeCode;
  };

  if (isLoading) {
    return (
      <section className={className}>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Size</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-lg border-2 border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Size</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {availableSizes.map((size) => {
          const minPrice = getMinPriceForSize(size);
          const isSelected = selectedSize === size;

          return (
            <button
              key={size}
              onClick={() => onSizeSelect(size)}
              disabled={isLoading}
              className={`p-4 rounded-lg border-2 transition-all text-center hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold text-gray-900">{getSizeDisplayName(size)}</div>
              <div className="text-sm font-medium text-green-600 mt-2">{minPrice > 0 ? `From $${minPrice.toFixed(2)}` : "Loading..."}</div>
            </button>
          );
        })}
      </div>

      {/* Optional: Size comparison helper */}
      {selectedSize && (
        <div className="mt-3 text-sm text-gray-600 text-center">
          <span className="font-medium">{getSizeDisplayName(selectedSize)}</span> selected
          {availableSizes.length > 1 && " - click another size to change"}
        </div>
      )}
    </section>
  );
}

// src/components/features/orders/customizers/PizzaCrustSelector.tsx
// Step 2: Extract crust selection logic including business rules

"use client";
import { ConfiguredCartItem, CrustPricing, PizzaMenuResponse } from "@/lib/types";
import { useMemo } from "react";

interface CrustOption {
  sizeCode: string;
  crustType: string;
  basePrice: number;
  upcharge: number;
  displayName: string;
  isAvailable: boolean;
  unavailableReason?: string;
}

interface PizzaCrustSelectorProps {
  selectedSize: string;
  selectedCrust: CrustOption | null;
  onCrustSelect: (crust: CrustOption) => void;
  pizzaMenuData: PizzaMenuResponse | null;
  item: ConfiguredCartItem;
  isLoading?: boolean;
  className?: string;
}

export function PizzaCrustSelector({
  selectedSize,
  selectedCrust,
  onCrustSelect,
  pizzaMenuData,
  item,
  isLoading = false,
  className = "",
}: PizzaCrustSelectorProps) {
  // Business rule: Gluten-free restrictions
  const shouldDisableGlutenFree = (item: ConfiguredCartItem, selectedSize: string): boolean => {
    const itemName = item.menuItemName.toLowerCase();

    // Deep-dish pizzas cannot have gluten-free on 10" size
    if (selectedSize === "small" || selectedSize === "10in") {
      if (itemName === "stuffed pizza" || itemName === "the chub") {
        return true;
      }
    }

    return false;
  };

  const getCrustDisplayName = (crustType: string): string => {
    const crustNames: Record<string, string> = {
      thin: "Thin Crust",
      double_dough: "Double Dough",
      gluten_free: "Gluten Free",
      stuffed: "Stuffed Crust",
    };
    return crustNames[crustType] || crustType;
  };

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

  // Generate available crusts with business rules applied
  const availableCrusts = useMemo((): CrustOption[] => {
    if (!selectedSize || !pizzaMenuData) return [];

    return pizzaMenuData.crust_pricing
      .filter((cp: CrustPricing) => {
        const matchesSize =
          cp.size_code === selectedSize ||
          (selectedSize === "medium" && cp.size_code === "12in") ||
          (selectedSize === "small" && cp.size_code === "10in") ||
          (selectedSize === "large" && cp.size_code === "14in") ||
          (selectedSize === "xlarge" && cp.size_code === "16in");

        const itemName = item.menuItemName.toLowerCase();
        const isDeepDishPizza = itemName === "stuffed pizza" || itemName === "the chub";

        // Hide stuffed crust for regular pizzas
        if (cp.crust_type === "stuffed" && !isDeepDishPizza) {
          return false;
        }

        return matchesSize;
      })
      .map((cp: CrustPricing): CrustOption => {
        const isGlutenFreeDisabled = cp.crust_type === "gluten_free" && shouldDisableGlutenFree(item, selectedSize);

        return {
          sizeCode: selectedSize,
          crustType: cp.crust_type,
          basePrice: cp.base_price,
          upcharge: cp.upcharge,
          displayName: getCrustDisplayName(cp.crust_type),
          isAvailable: !isGlutenFreeDisabled,
          unavailableReason: isGlutenFreeDisabled ? "Not available for this pizza/size" : undefined,
        };
      });
  }, [selectedSize, pizzaMenuData, item]);

  if (!selectedSize) {
    return (
      <section className={className}>
        <h3 className="text-lg font-semibold text-gray-400 mb-3">Choose Crust</h3>
        <div className="text-gray-500 text-center py-8">Please select a size first</div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className={className}>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Crust ({getSizeDisplayName(selectedSize)})</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border-2 border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-6 bg-gray-300 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Crust ({getSizeDisplayName(selectedSize)})</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {availableCrusts.map((crust) => {
          const isSelected = selectedCrust?.crustType === crust.crustType;

          return (
            <button
              key={`${crust.sizeCode}-${crust.crustType}`}
              onClick={() => crust.isAvailable && onCrustSelect(crust)}
              disabled={!crust.isAvailable || isLoading}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed ${
                isSelected
                  ? "border-blue-600 bg-blue-50 shadow-md"
                  : crust.isAvailable
                  ? "border-gray-200 hover:border-gray-300"
                  : "border-gray-200 bg-gray-100 opacity-50"
              }`}
            >
              <div className="text-left">
                <div className="font-semibold text-gray-900">{crust.displayName}</div>
                <div className="text-lg font-bold text-green-600 mt-2">${crust.basePrice.toFixed(2)}</div>

                {crust.upcharge > 0 && <div className="text-sm text-gray-600">+${crust.upcharge.toFixed(2)} upcharge</div>}

                {!crust.isAvailable && crust.unavailableReason && (
                  <div className="text-sm text-red-600 mt-1">{crust.unavailableReason}</div>
                )}

                {isSelected && <div className="text-sm text-blue-600 font-medium mt-1">✓ Selected</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      {selectedCrust && (
        <div className="mt-3 text-sm text-gray-600 text-center">
          <span className="font-medium">{selectedCrust.displayName}</span> selected
          {selectedCrust.upcharge > 0 && <span> (includes ${selectedCrust.upcharge.toFixed(2)} upcharge)</span>}
        </div>
      )}

      {/* Business rule notifications */}
      {availableCrusts.some((c) => !c.isAvailable) && (
        <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          <span className="font-medium">Note:</span> Some crust options may not be available for certain pizza types or sizes.
        </div>
      )}
    </section>
  );
}

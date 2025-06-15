"use client";
import { PizzaPriceCalculationResponse } from "@/lib/types";

interface PricingDisplayProps {
  currentPricing: PizzaPriceCalculationResponse | null;
  isCalculating: boolean;
  pricingError: string | null;
  selectedSize?: string;
  selectedCrust?: string;
  className?: string;
}

export function PricingDisplay({
  currentPricing,
  isCalculating,
  pricingError,
  selectedSize,
  selectedCrust,
  className = "",
}: PricingDisplayProps) {
  const finalPrice = currentPricing?.finalPrice || 0;

  return (
    <section className={`bg-green-50 border border-green-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-green-900">Pricing Breakdown</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {isCalculating ? <span className="text-gray-500">Calculating...</span> : `$${finalPrice.toFixed(2)}`}
          </div>
          <div className="text-sm text-green-700">Total Price</div>
        </div>
      </div>

      {/* Configuration Summary */}
      {selectedSize && selectedCrust && (
        <div className="mb-4 p-3 bg-white rounded border border-green-200">
          <div className="text-sm font-medium text-gray-900 mb-1">Current Configuration:</div>
          <div className="text-sm text-gray-700">
            {selectedSize} {selectedCrust}
          </div>
        </div>
      )}

      {/* Error State */}
      {pricingError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <div className="text-sm text-red-800">
            <span className="font-medium">Pricing Error:</span> {pricingError}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isCalculating && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm text-blue-800 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Calculating updated pricing...
          </div>
        </div>
      )}

      {/* Pricing Breakdown */}
      {currentPricing?.breakdown && currentPricing.breakdown.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-900 mb-2">Price Details:</div>

          {currentPricing.breakdown.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-1 text-sm">
              <span
                className={`${
                  item.type === "regular_base" || item.type === "specialty_base" ? "font-medium text-gray-900" : "text-gray-700"
                }`}
              >
                {item.name}
                {item.type === "template_default" && <span className="ml-1 text-xs text-purple-600 font-medium">INCLUDED</span>}
              </span>
              <span className={`font-medium ${item.price === 0 ? "text-purple-600" : item.price > 0 ? "text-green-600" : "text-red-600"}`}>
                {item.price === 0 ? "FREE" : `$${item.price.toFixed(2)}`}
              </span>
            </div>
          ))}

          {/* Total Line */}
          <div className="border-t border-green-300 pt-2 mt-3">
            <div className="flex justify-between items-center text-base font-bold">
              <span className="text-gray-900">Total:</span>
              <span className="text-green-600">${finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* No Pricing Data */}
      {!currentPricing && !isCalculating && !pricingError && (
        <div className="text-center py-4 text-gray-500">
          <div className="text-sm">Select size and crust to see pricing</div>
        </div>
      )}

      {/* Fractional Pricing Note */}
      {currentPricing?.breakdown?.some(
        (item) => item.name?.includes("Half") || item.name?.includes("Quarter") || item.name?.includes("1/4") || item.name?.includes("3/4")
      ) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-xs text-blue-800">
            <span className="font-medium">💡 Tip:</span> Fractional toppings are charged based on coverage area.
          </div>
        </div>
      )}

      {/* Template Info */}
      {currentPricing?.template_info && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
          <div className="text-xs text-purple-800">
            <span className="font-medium">✨ {currentPricing.template_info.name}:</span> {currentPricing.template_info.pricing_note}
          </div>
        </div>
      )}
    </section>
  );
}

// src/components/features/orders/customizers/ToppingSelector.tsx
// Focused component for topping selection with fractional support

"use client";
import { ToppingAmount } from "@/lib/types";
import { ToppingPlacement, ToppingState } from "@/lib/types/pizza";
import { useMemo } from "react";
import { ToppingPlacementControl } from "./ToppingPlacementControl";

interface ToppingSelectorProps {
  toppings: ToppingState[];
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
  onToppingPlacementChange: (toppingId: string, placement: ToppingPlacement) => void;
  expandedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  selectedSize: string;
  showPlacements?: boolean;
}

const TOPPING_CATEGORIES = {
  meats: {
    displayName: "Meats & Proteins",
    icon: "🥓",
    keywords: ["pepperoni", "sausage", "bacon", "canadian bacon", "salami", "ham", "chicken", "meatball", "beef"],
  },
  vegetables: {
    displayName: "Vegetables & Fruits",
    icon: "🥬",
    keywords: ["mushroom", "onion", "pepper", "olive", "tomato", "spinach", "basil", "pineapple", "giardiniera"],
  },
  cheese: {
    displayName: "Cheese",
    icon: "🧀",
    keywords: ["mozzarella", "feta", "parmesan", "goat cheese", "ricotta", "cheese", "extra"],
  },
  sauces: {
    displayName: "Sauces",
    icon: "🍅",
    keywords: ["alfredo", "bbq", "garlic butter", "sauce", "no sauce"],
  },
} as const;

export function ToppingSelector({
  toppings,
  onToppingChange,
  onToppingPlacementChange,
  expandedCategories,
  onToggleCategory,
  selectedSize,
  showPlacements = true,
}: ToppingSelectorProps) {
  // Group toppings by category
  const { includedToppings, addOnToppings } = useMemo(() => {
    const included = toppings.filter((t) => t.isSpecialtyDefault);
    const addOns = toppings.filter((t) => !t.isSpecialtyDefault);

    const groupedAddOns = addOns.reduce((acc, topping) => {
      const category = topping.displayCategory;
      if (!acc[category]) acc[category] = [];
      acc[category].push(topping);
      return acc;
    }, {} as Record<string, ToppingState[]>);

    return { includedToppings: included, addOnToppings: groupedAddOns };
  }, [toppings]);

  const getSizeDisplayName = (sizeCode: string): string => {
    const sizeNames: Record<string, string> = {
      small: 'Small 10"',
      medium: 'Medium 12"',
      large: 'Large 14"',
      xlarge: 'X-Large 16"',
    };
    return sizeNames[sizeCode] || sizeCode;
  };

  const getCategoryDisplayName = (category: string) => {
    const config = TOPPING_CATEGORIES[category as keyof typeof TOPPING_CATEGORIES];
    return config?.displayName || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getCategoryIcon = (category: string) => {
    const config = TOPPING_CATEGORIES[category as keyof typeof TOPPING_CATEGORIES];
    return config?.icon || "🍕";
  };

  return (
    <div className="space-y-6">
      {/* Included Toppings Section */}
      {includedToppings.length > 0 && (
        <section className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="text-lg font-semibold text-purple-900 flex items-center">
              <span className="mr-2 text-xl">✨</span>
              Included Toppings
            </div>
            <div className="ml-auto text-sm text-purple-700 font-medium">Included in {getSizeDisplayName(selectedSize)} price</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {includedToppings.map((topping) => (
              <IncludedToppingCard
                key={topping.id}
                topping={topping}
                onToppingChange={onToppingChange}
                onPlacementChange={onToppingPlacementChange}
                showPlacements={showPlacements}
              />
            ))}
          </div>
        </section>
      )}

      {/* Add-on Toppings Section */}
      {Object.keys(addOnToppings).length > 0 && (
        <section>
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="mr-2 text-xl">🍕</span>
              Add-on Toppings
            </h3>
            <div className="ml-auto text-sm text-gray-600">Prices for {getSizeDisplayName(selectedSize)}</div>
          </div>

          <div className="space-y-3">
            {Object.entries(addOnToppings).map(([category, categoryToppings]) => {
              const isExpanded = expandedCategories.has(category);
              const activeCount = categoryToppings.filter((t) => t.isActive).length;

              return (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => onToggleCategory(category)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{getCategoryIcon(category)}</span>
                      <span className="font-medium text-gray-900">{getCategoryDisplayName(category)}</span>
                      {activeCount > 0 && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                          {activeCount} selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">{categoryToppings.length} items</span>
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Category Content */}
                  {isExpanded && (
                    <div className="p-4 bg-white">
                      {category === "sauces" ? (
                        <SauceSelection sauces={categoryToppings} onToppingChange={onToppingChange} />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryToppings.map((topping) => (
                            <ToppingCard
                              key={topping.id}
                              topping={topping}
                              onToppingChange={onToppingChange}
                              onPlacementChange={onToppingPlacementChange}
                              showPlacements={showPlacements}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ===================================================================
// SUB-COMPONENTS
// ===================================================================

interface IncludedToppingCardProps {
  topping: ToppingState;
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
  onPlacementChange: (toppingId: string, placement: ToppingPlacement) => void;
  showPlacements: boolean;
}

function IncludedToppingCard({ topping, onToppingChange, onPlacementChange, showPlacements }: IncludedToppingCardProps) {
  return (
    <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-medium text-gray-900">{topping.name}</span>
          <div className="flex items-center mt-1">
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">INCLUDED</span>
            {topping.tier !== "normal" && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                {topping.tier === "beef" ? "🥩 BEEF" : "⭐ PREMIUM"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Amount Selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Amount:</label>
          <select
            value={topping.amount}
            onChange={(e) => onToppingChange(topping.id, e.target.value as ToppingAmount)}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="none">Remove</option>
            <option value="light">Light</option>
            <option value="normal">Normal (Default)</option>
            <option value="extra">Extra</option>
            <option value="xxtra">XXtra</option>
          </select>
        </div>

        {/* Placement Selection */}
        {showPlacements && topping.amount !== "none" && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Placement:</label>
            <ToppingPlacementControl placement={topping.placement} onChange={(placement) => onPlacementChange(topping.id, placement)} />
          </div>
        )}
      </div>

      {/* Pricing Display */}
      <div className="mt-3 text-sm font-semibold">
        {topping.amount === "normal" ? (
          <span className="text-purple-600">INCLUDED</span>
        ) : topping.amount === "none" ? (
          <span className="text-gray-500">REMOVED</span>
        ) : topping.calculatedPrice > 0 ? (
          <span className="text-green-600">+${topping.calculatedPrice.toFixed(2)}</span>
        ) : (
          <span className="text-purple-600">INCLUDED</span>
        )}
      </div>
    </div>
  );
}

interface ToppingCardProps {
  topping: ToppingState;
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
  onPlacementChange: (toppingId: string, placement: ToppingPlacement) => void;
  showPlacements: boolean;
}

function ToppingCard({ topping, onToppingChange, onPlacementChange, showPlacements }: ToppingCardProps) {
  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        topping.isActive ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-gray-900 leading-tight">{topping.name}</span>
          <div className="flex items-center gap-1 ml-2">
            {topping.tier !== "normal" && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded font-medium">
                {topping.tier === "beef" ? "🥩" : "⭐"}
              </span>
            )}
          </div>
        </div>

        {/* Amount Selection */}
        <select
          value={topping.amount}
          onChange={(e) => onToppingChange(topping.id, e.target.value as ToppingAmount)}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="none">None</option>
          <option value="light">Light</option>
          <option value="normal">Normal</option>
          <option value="extra">Extra</option>
          <option value="xxtra">XXtra</option>
        </select>

        {/* Placement Selection */}
        {showPlacements && topping.isActive && (
          <ToppingPlacementControl
            placement={topping.placement}
            onChange={(placement) => onPlacementChange(topping.id, placement)}
            className="text-xs"
          />
        )}

        {/* Pricing */}
        {topping.isActive && (
          <div className="text-sm font-semibold">
            {topping.calculatedPrice > 0 ? (
              <span className="text-green-600">+${topping.calculatedPrice.toFixed(2)}</span>
            ) : (
              <span className="text-blue-600">Calculating...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SauceSelectionProps {
  sauces: ToppingState[];
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
}

function SauceSelection({ sauces, onToppingChange }: SauceSelectionProps) {
  const handleSauceSelect = (sauceId: string) => {
    // Clear all other sauces
    sauces.forEach((sauce) => {
      if (sauce.id !== sauceId && sauce.amount !== "none") {
        onToppingChange(sauce.id, "none");
      }
    });

    // Set selected sauce
    const currentSauce = sauces.find((s) => s.id === sauceId);
    if (currentSauce) {
      onToppingChange(sauceId, currentSauce.amount === "none" ? "normal" : "none");
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 mb-3">Choose one sauce (all sauces are free):</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sauces.map((sauce) => (
          <label
            key={sauce.id}
            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
              sauce.amount !== "none" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="sauce-selection"
              checked={sauce.amount !== "none"}
              onChange={() => handleSauceSelect(sauce.id)}
              className="mr-3 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">{sauce.name}</span>
              <div className="text-sm text-green-600 font-medium">FREE</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

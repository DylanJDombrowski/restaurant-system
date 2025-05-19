// src/components/features/orders/PizzaCustomizer.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { ConfiguredCartItem } from "./EnhancedMenuItemSelector";

/**
 * Pizza Customizer Component
 *
 * This is the sophisticated customization interface that handles the complex
 * business logic you outlined. It understands:
 *
 * 1. Specialty pizzas start with their default toppings at full price
 * 2. Removing default toppings doesn't provide credits
 * 3. Adding new toppings costs extra
 * 4. Topping amounts (light/normal/extra) affect pricing
 * 5. Cheese can be removed entirely (NO CHEESE option)
 * 6. Modifiers can add cooking instructions and preferences
 *
 * Think of this as the digital equivalent of a skilled order-taker who
 * understands the nuances of pizza pricing and preparation.
 */

// Mock topping data - in production this comes from your database
const AVAILABLE_TOPPINGS = [
  // Meats
  {
    id: "pepperoni",
    name: "Pepperoni",
    category: "meats",
    basePrice: 2.0,
    isPremium: false,
  },
  {
    id: "italian-sausage",
    name: "Italian Sausage",
    category: "meats",
    basePrice: 2.0,
    isPremium: false,
  },
  {
    id: "ground-beef",
    name: "Ground Beef",
    category: "meats",
    basePrice: 2.0,
    isPremium: false,
  },
  {
    id: "canadian-bacon",
    name: "Canadian Bacon",
    category: "meats",
    basePrice: 2.5,
    isPremium: true,
  },
  {
    id: "prosciutto",
    name: "Prosciutto",
    category: "meats",
    basePrice: 3.0,
    isPremium: true,
  },

  // Vegetables
  {
    id: "mushrooms",
    name: "Mushrooms",
    category: "vegetables",
    basePrice: 1.5,
    isPremium: false,
  },
  {
    id: "green-peppers",
    name: "Green Peppers",
    category: "vegetables",
    basePrice: 1.5,
    isPremium: false,
  },
  {
    id: "red-onions",
    name: "Red Onions",
    category: "vegetables",
    basePrice: 1.5,
    isPremium: false,
  },
  {
    id: "black-olives",
    name: "Black Olives",
    category: "vegetables",
    basePrice: 1.5,
    isPremium: false,
  },
  {
    id: "roma-tomatoes",
    name: "Roma Tomatoes",
    category: "vegetables",
    basePrice: 1.5,
    isPremium: false,
  },
  {
    id: "hot-giardiniera",
    name: "Hot Giardiniera",
    category: "vegetables",
    basePrice: 1.75,
    isPremium: false,
  },
  {
    id: "roasted-red-peppers",
    name: "Roasted Red Peppers",
    category: "vegetables",
    basePrice: 2.0,
    isPremium: true,
  },

  // Cheese
  {
    id: "extra-cheese",
    name: "Extra Cheese",
    category: "cheese",
    basePrice: 2.0,
    isPremium: false,
  },
  {
    id: "fresh-mozzarella",
    name: "Fresh Mozzarella",
    category: "cheese",
    basePrice: 2.5,
    isPremium: true,
  },
  {
    id: "goat-cheese",
    name: "Goat Cheese",
    category: "cheese",
    basePrice: 3.0,
    isPremium: true,
  },
  {
    id: "ricotta",
    name: "Ricotta",
    category: "cheese",
    basePrice: 2.0,
    isPremium: false,
  },
];

// Mock modifier data
const AVAILABLE_MODIFIERS = [
  { id: "well-done", name: "Well Done", priceAdjustment: 0.0 },
  { id: "light-bake", name: "Light Bake", priceAdjustment: 0.0 },
  { id: "cut-squares", name: "Cut in Squares", priceAdjustment: 0.0 },
  { id: "no-cut", name: "Don't Cut", priceAdjustment: 0.0 },
  { id: "extra-sauce", name: "Extra Sauce", priceAdjustment: 1.0 },
  { id: "light-sauce", name: "Light Sauce", priceAdjustment: 0.0 },
  { id: "no-sauce", name: "No Sauce", priceAdjustment: 0.0 },
];

interface PizzaCustomizerProps {
  item: ConfiguredCartItem;
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
}

interface ToppingConfiguration {
  id: string;
  name: string;
  amount: "none" | "light" | "normal" | "extra";
  price: number;
  isDefault: boolean;
  category: string;
}

interface ModifierConfiguration {
  id: string;
  name: string;
  priceAdjustment: number;
  selected: boolean;
}

export default function PizzaCustomizer({
  item,
  onComplete,
  onCancel,
}: PizzaCustomizerProps) {
  // Initialize state from the cart item
  const [toppings, setToppings] = useState<ToppingConfiguration[]>([]);
  const [modifiers, setModifiers] = useState<ModifierConfiguration[]>([]);
  const [hasCheese, setHasCheese] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState(
    item.specialInstructions || ""
  );

  // Initialize topping configurations
  useEffect(() => {
    initializeToppings();
    initializeModifiers();
  }, [item]);

  const initializeToppings = () => {
    const toppingConfigs: ToppingConfiguration[] = [];

    // First, add all default toppings from the item
    if (item.selectedToppings) {
      item.selectedToppings.forEach(
        (selectedTopping: {
          id: string;
          name: string;
          amount: "none" | "light" | "normal" | "extra";
          price: number;
          isDefault: boolean;
        }) => {
          const availableTopping = AVAILABLE_TOPPINGS.find(
            (t) => t.id === selectedTopping.id
          );
          if (availableTopping) {
            toppingConfigs.push({
              id: selectedTopping.id,
              name: selectedTopping.name,
              amount: selectedTopping.amount,
              price: calculateToppingPrice(
                availableTopping,
                selectedTopping.amount,
                selectedTopping.isDefault
              ),
              isDefault: selectedTopping.isDefault,
              category: availableTopping.category,
            });
          }
        }
      );
    }

    // Then, add all other available toppings as "none"
    AVAILABLE_TOPPINGS.forEach((availableTopping) => {
      const existing = toppingConfigs.find((t) => t.id === availableTopping.id);
      if (!existing) {
        toppingConfigs.push({
          id: availableTopping.id,
          name: availableTopping.name,
          amount: "none",
          price: 0,
          isDefault: false,
          category: availableTopping.category,
        });
      }
    });

    setToppings(toppingConfigs);

    // Check if item has cheese by default
    const hasDefaultCheese = item.selectedToppings?.some(
      (t: { id: string; isDefault: boolean }) =>
        t.id === "cheese" && t.isDefault
    );
    setHasCheese(hasDefaultCheese !== false);
  };

  const initializeModifiers = () => {
    const modifierConfigs: ModifierConfiguration[] = AVAILABLE_MODIFIERS.map(
      (mod) => ({
        id: mod.id,
        name: mod.name,
        priceAdjustment: mod.priceAdjustment,
        selected:
          item.selectedModifiers?.some(
            (m: { id: string }) => m.id === mod.id
          ) || false,
      })
    );

    setModifiers(modifierConfigs);
  };

  // Calculate topping price based on amount and whether it's default
  const calculateToppingPrice = (
    topping: (typeof AVAILABLE_TOPPINGS)[0],
    amount: "none" | "light" | "normal" | "extra",
    isDefault: boolean
  ): number => {
    if (amount === "none") return 0;

    // Default toppings don't cost extra unless you get "extra"
    if (isDefault) {
      return amount === "extra" ? topping.basePrice * 0.5 : 0;
    }

    // Non-default toppings have full pricing
    switch (amount) {
      case "light":
        return topping.basePrice * 0.75;
      case "normal":
        return topping.basePrice;
      case "extra":
        return topping.basePrice * 1.5;
      default:
        return 0;
    }
  };

  // Handle topping amount changes
  const handleToppingChange = (
    toppingId: string,
    newAmount: "none" | "light" | "normal" | "extra"
  ) => {
    setToppings((prev) =>
      prev.map((topping) => {
        if (topping.id === toppingId) {
          const availableTopping = AVAILABLE_TOPPINGS.find(
            (t) => t.id === toppingId
          )!;
          const newPrice = calculateToppingPrice(
            availableTopping,
            newAmount,
            topping.isDefault
          );

          return {
            ...topping,
            amount: newAmount,
            price: newPrice,
          };
        }
        return topping;
      })
    );
  };

  // Handle modifier changes
  const handleModifierChange = (modifierId: string, selected: boolean) => {
    setModifiers((prev) =>
      prev.map((modifier) =>
        modifier.id === modifierId ? { ...modifier, selected } : modifier
      )
    );
  };

  // Calculate total price
  const calculatedPrice = useMemo(() => {
    let total = item.basePrice;

    // Add topping costs
    toppings.forEach((topping) => {
      total += topping.price;
    });

    // Add modifier costs
    modifiers.forEach((modifier) => {
      if (modifier.selected) {
        total += modifier.priceAdjustment;
      }
    });

    // Subtract cheese cost if no cheese is selected (for pizzas that default to cheese)
    if (!hasCheese) {
      // This could include logic to subtract cheese cost if needed
      // For now, we're not crediting cheese removal as per your requirements
    }

    return Math.max(0, total);
  }, [item.basePrice, toppings, modifiers, hasCheese]);

  // Group toppings by category for better organization
  const toppingsByCategory = useMemo(() => {
    return toppings.reduce((acc, topping) => {
      if (!acc[topping.category]) {
        acc[topping.category] = [];
      }
      acc[topping.category].push(topping);
      return acc;
    }, {} as Record<string, ToppingConfiguration[]>);
  }, [toppings]);

  // Handle save
  const handleSave = () => {
    // Build the updated cart item
    const updatedItem: ConfiguredCartItem = {
      ...item,
      selectedToppings: toppings
        .filter((t) => t.amount !== "none")
        .map((t) => ({
          id: t.id,
          name: t.name,
          amount: t.amount,
          price: t.price,
          isDefault: t.isDefault,
        })),
      selectedModifiers: modifiers
        .filter((m) => m.selected)
        .map((m) => ({
          id: m.id,
          name: m.name,
          priceAdjustment: m.priceAdjustment,
        })),
      specialInstructions,
      totalPrice: calculatedPrice,
      displayName: createUpdatedDisplayName(),
    };

    onComplete(updatedItem);
  };

  // Create display name based on customizations
  const createUpdatedDisplayName = (): string => {
    const baseName = item.displayName;
    const modifications: string[] = [];

    // Add notable modifications to the display name
    const addedToppings = toppings.filter(
      (t) => !t.isDefault && t.amount !== "none"
    );
    const removedDefaults = toppings.filter(
      (t) => t.isDefault && t.amount === "none"
    );

    if (addedToppings.length > 0) {
      modifications.push(`+${addedToppings.length} toppings`);
    }

    if (removedDefaults.length > 0) {
      modifications.push(`-${removedDefaults.length} defaults`);
    }

    if (!hasCheese) {
      modifications.push("NO CHEESE");
    }

    if (modifications.length > 0) {
      return `${baseName} (${modifications.join(", ")})`;
    }

    return baseName;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize {item.displayName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Base price: ${item.basePrice.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ${calculatedPrice.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Current total</div>
          </div>
        </div>
      </div>

      {/* Customization Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          {/* Cheese Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Cheese</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cheese"
                  checked={hasCheese}
                  onChange={() => setHasCheese(true)}
                  className="mr-2"
                />
                <span>Regular Cheese</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cheese"
                  checked={!hasCheese}
                  onChange={() => setHasCheese(false)}
                  className="mr-2"
                />
                <span className="font-semibold text-red-600">NO CHEESE</span>
              </label>
            </div>
          </div>

          {/* Toppings by Category */}
          {Object.entries(toppingsByCategory).map(
            ([category, categoryToppings]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryToppings.map((topping) => (
                    <ToppingSelector
                      key={topping.id}
                      topping={topping}
                      onChange={(amount) =>
                        handleToppingChange(topping.id, amount)
                      }
                    />
                  ))}
                </div>
              </div>
            )
          )}

          {/* Modifiers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Cooking Instructions & Preferences
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {modifiers.map((modifier) => (
                <ModifierSelector
                  key={modifier.id}
                  modifier={modifier}
                  onChange={(selected) =>
                    handleModifierChange(modifier.id, selected)
                  }
                />
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Special Instructions
            </h3>
            <textarea
              placeholder="Any special requests for this item..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Footer with actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                Total: ${calculatedPrice.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                {calculatedPrice > item.basePrice && (
                  <>
                    +${(calculatedPrice - item.basePrice).toFixed(2)} in
                    modifications
                  </>
                )}
              </div>
            </div>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Update Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Topping Selector Component
 *
 * Handles individual topping amount selection with clear pricing display.
 */
interface ToppingSelectorProps {
  topping: ToppingConfiguration;
  onChange: (amount: "none" | "light" | "normal" | "extra") => void;
}

function ToppingSelector({ topping, onChange }: ToppingSelectorProps) {
  const availableTopping = AVAILABLE_TOPPINGS.find((t) => t.id === topping.id)!;

  // Calculate price preview for each amount option
  const pricePreview = {
    none: 0,
    light: calculateToppingPrice(availableTopping, "light", topping.isDefault),
    normal: calculateToppingPrice(
      availableTopping,
      "normal",
      topping.isDefault
    ),
    extra: calculateToppingPrice(availableTopping, "extra", topping.isDefault),
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "";
    return `+$${price.toFixed(2)}`;
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        topping.amount !== "none"
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200"
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="font-medium text-gray-900">{topping.name}</span>
          {topping.isDefault && (
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Default
            </span>
          )}
          {availableTopping.isPremium && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Premium
            </span>
          )}
        </div>
        {topping.price > 0 && (
          <span className="text-sm font-semibold text-green-600">
            +${topping.price.toFixed(2)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(["none", "light", "normal", "extra"] as const).map((amount) => (
          <button
            key={amount}
            onClick={() => onChange(amount)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              topping.amount === amount
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <div>
              {amount === "none"
                ? "None"
                : amount.charAt(0).toUpperCase() + amount.slice(1)}
            </div>
            {amount !== "none" && (
              <div className="text-xs">{formatPrice(pricePreview[amount])}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Modifier Selector Component
 *
 * Handles cooking instructions and other modifications.
 */
interface ModifierSelectorProps {
  modifier: ModifierConfiguration;
  onChange: (selected: boolean) => void;
}

function ModifierSelector({ modifier, onChange }: ModifierSelectorProps) {
  return (
    <label
      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
        modifier.selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={modifier.selected}
          onChange={(e) => onChange(e.target.checked)}
          className="mr-3"
        />
        <span className="font-medium text-gray-900">{modifier.name}</span>
      </div>
      {modifier.priceAdjustment !== 0 && (
        <span
          className={`text-sm font-semibold ${
            modifier.priceAdjustment > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {modifier.priceAdjustment > 0 ? "+" : ""}$
          {modifier.priceAdjustment.toFixed(2)}
        </span>
      )}
    </label>
  );
}

// Helper function to calculate topping prices (same as in component)
function calculateToppingPrice(
  topping: (typeof AVAILABLE_TOPPINGS)[0],
  amount: "none" | "light" | "normal" | "extra",
  isDefault: boolean
): number {
  if (amount === "none") return 0;

  // Default toppings don't cost extra unless you get "extra"
  if (isDefault) {
    return amount === "extra" ? topping.basePrice * 0.5 : 0;
  }

  // Non-default toppings have full pricing
  switch (amount) {
    case "light":
      return topping.basePrice * 0.75;
    case "normal":
      return topping.basePrice;
    case "extra":
      return topping.basePrice * 1.5;
    default:
      return 0;
  }
}

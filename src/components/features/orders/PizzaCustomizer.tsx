// src/components/features/orders/PizzaCustomizer.tsx
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ConfiguredCartItem, Topping, Modifier } from "@/lib/types";

/**
 * Pizza Customizer Component
 *
 * This is the sophisticated customization interface that handles pizza customization
 * with data fetched from your database instead of hardcoded values.
 */

interface ToppingConfiguration {
  id: string;
  name: string;
  amount: "none" | "light" | "normal" | "extra";
  price: number;
  isDefault: boolean;
  category: string;
  isPremium?: boolean;
  basePrice: number;
}

interface ModifierConfiguration {
  id: string;
  name: string;
  priceAdjustment: number;
  selected: boolean;
}

interface PizzaCustomizerProps {
  item: ConfiguredCartItem;
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
}

export default function PizzaCustomizer({
  item,
  onComplete,
  onCancel,
}: PizzaCustomizerProps) {
  // State for database data
  const [availableToppings, setAvailableToppings] = useState<Topping[]>([]);
  const [availableModifiers, setAvailableModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for customization
  const [toppings, setToppings] = useState<ToppingConfiguration[]>([]);
  const [modifiers, setModifiers] = useState<ModifierConfiguration[]>([]);
  const [hasCheese, setHasCheese] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState(
    item.specialInstructions || ""
  );

  // Fetch toppings and modifiers from the database
  useEffect(() => {
    async function fetchToppingsAndModifiers() {
      try {
        setLoading(true);
        setError(null);

        // Using restaurant ID from your authenticated context or first restaurant
        // For now, we'll use a default restaurant ID from your system
        const response = await fetch("/api/restaurants");
        const restaurantData = await response.json();
        const restaurantId = restaurantData.data?.id;

        if (!restaurantId) {
          throw new Error("Failed to get restaurant ID");
        }

        // Fetch toppings
        const toppingsResponse = await fetch(
          `/api/menu/toppings?restaurant_id=${restaurantId}`
        );
        if (!toppingsResponse.ok) {
          throw new Error(
            `Failed to fetch toppings: ${toppingsResponse.status}`
          );
        }
        const toppingsData = await toppingsResponse.json();
        setAvailableToppings(toppingsData.data || []);

        // Fetch modifiers
        const modifiersResponse = await fetch(
          `/api/menu/modifiers?restaurant_id=${restaurantId}`
        );
        if (!modifiersResponse.ok) {
          throw new Error(
            `Failed to fetch modifiers: ${modifiersResponse.status}`
          );
        }
        const modifiersData = await modifiersResponse.json();
        setAvailableModifiers(modifiersData.data || []);
      } catch (error) {
        console.error("Error fetching pizza customization options:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load customization options"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchToppingsAndModifiers();
  }, []);

  // Initialize toppings configurations
  const initializeToppings = useCallback(() => {
    const toppingConfigs: ToppingConfiguration[] = [];

    // First, add all default toppings from the item
    if (item.selectedToppings) {
      item.selectedToppings.forEach((selectedTopping) => {
        const availableTopping = availableToppings.find(
          (t) => t.id === selectedTopping.id
        );
        if (availableTopping) {
          toppingConfigs.push({
            id: selectedTopping.id,
            name: selectedTopping.name,
            amount: selectedTopping.amount,
            price: selectedTopping.price,
            isDefault: selectedTopping.isDefault,
            category: selectedTopping.category || availableTopping.category,
            isPremium: availableTopping.is_premium,
            basePrice: availableTopping.is_premium ? 3.0 : 2.0, // Default pricing logic
          });
        }
      });
    }

    // Then, add all other available toppings as "none"
    availableToppings.forEach((availableTopping) => {
      const existing = toppingConfigs.find((t) => t.id === availableTopping.id);
      if (!existing) {
        toppingConfigs.push({
          id: availableTopping.id,
          name: availableTopping.name,
          amount: "none",
          price: 0,
          isDefault: false,
          category: availableTopping.category,
          isPremium: availableTopping.is_premium,
          basePrice: availableTopping.is_premium ? 3.0 : 2.0, // Default pricing logic
        });
      }
    });

    setToppings(toppingConfigs);

    // Check if item has cheese by default
    const hasDefaultCheese = item.selectedToppings?.some(
      (t) => t.name.toLowerCase().includes("cheese") && t.isDefault
    );
    setHasCheese(hasDefaultCheese !== false);
  }, [availableToppings, item.selectedToppings]);

  // Initialize modifiers
  const initializeModifiers = useCallback(() => {
    const modifierConfigs: ModifierConfiguration[] = availableModifiers.map(
      (mod) => ({
        id: mod.id,
        name: mod.name,
        priceAdjustment: mod.price_adjustment,
        selected: item.selectedModifiers?.some((m) => m.id === mod.id) || false,
      })
    );

    setModifiers(modifierConfigs);
  }, [availableModifiers, item.selectedModifiers]);

  // Initialize toppings from database data
  useEffect(() => {
    if (availableToppings.length > 0) {
      initializeToppings();
    }
  }, [availableToppings, initializeToppings, item.selectedToppings]);

  // Initialize modifiers from database data
  useEffect(() => {
    if (availableModifiers.length > 0) {
      initializeModifiers();
    }
  }, [availableModifiers, initializeModifiers, item.selectedModifiers]);

  // Calculate topping price based on amount and whether it's default
  const calculateToppingPrice = (
    topping: ToppingConfiguration,
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
          const newPrice = calculateToppingPrice(
            topping,
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
          category: t.category,
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

  // Display loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-8">
        <div>
          <div className="text-lg font-medium text-gray-900 mb-2">
            Loading pizza options...
          </div>
          <div className="text-sm text-gray-500">
            Getting all the freshest toppings for you
          </div>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-8">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600 mb-2">
            Error loading pizza customization options
          </div>
          <div className="text-sm text-gray-800 mb-4">{error}</div>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

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
        <div className="p-4 space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
 */
interface ToppingSelectorProps {
  topping: ToppingConfiguration;
  onChange: (amount: "none" | "light" | "normal" | "extra") => void;
}

function ToppingSelector({ topping, onChange }: ToppingSelectorProps) {
  // Calculate price preview for each amount option
  const pricePreview = {
    none: 0,
    light: calculateToppingPrice(topping, "light", topping.isDefault),
    normal: calculateToppingPrice(topping, "normal", topping.isDefault),
    extra: calculateToppingPrice(topping, "extra", topping.isDefault),
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
          {topping.isPremium && (
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

/**
 * Helper function to calculate topping prices
 */
function calculateToppingPrice(
  topping: ToppingConfiguration,
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

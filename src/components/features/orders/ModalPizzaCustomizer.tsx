// src/components/features/orders/ModalPizzaCustomizer.tsx
"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ConfiguredCartItem,
  Topping,
  Modifier,
  ToppingAmount,
  MenuItemWithVariants,
} from "@/lib/types";

/**
 * Modal Pizza Customizer
 *
 * This component provides the same sophisticated customization capabilities
 * as the full-screen version, but in a modal format that maintains context
 * with the ongoing order. It's specifically designed for editing existing
 * cart items or quick customization without losing sight of the full order.
 *
 * Key Design Principles:
 * - Modal size allows staff to see the order context behind it
 * - Compact layout focuses on the most common customization tasks
 * - Maintains all the business logic and pricing accuracy of the full version
 * - Optimized for quick modifications rather than building from scratch
 */

interface ToppingConfiguration {
  id: string;
  name: string;
  amount: ToppingAmount;
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

interface ModalPizzaCustomizerProps {
  item: ConfiguredCartItem;
  menuItemWithVariants?: MenuItemWithVariants;
  availableToppings: Topping[];
  availableModifiers: Modifier[];
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function ModalPizzaCustomizer({
  item,
  availableToppings,
  availableModifiers,
  onComplete,
  onCancel,
  isOpen,
}: ModalPizzaCustomizerProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [toppings, setToppings] = useState<ToppingConfiguration[]>([]);
  const [modifiers, setModifiers] = useState<ModifierConfiguration[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    item.specialInstructions || ""
  );

  // Available crust options (updated with your actual crust types)
  const availableCrusts = useMemo(
    () => [
      { name: "Thin", description: "Crispy and light" },
      { name: "Double Dough", description: "Thick and hearty" },
      { name: "Extra Thin", description: "Ultra crispy", special: true },
      { name: "Stuffed", description: "Cheese-filled crust", premium: true },
    ],
    []
  );

  const [selectedCrust, setSelectedCrust] = useState("Thin");

  // ==========================================
  // INITIALIZATION LOGIC
  // ==========================================

  /**
   * Initialize toppings from the cart item's current configuration
   * This is more complex than it might seem because we need to handle:
   * 1. Existing toppings that the customer has already selected
   * 2. Available toppings that they could add
   * 3. Default toppings from specialty pizzas
   * 4. Proper pricing for each scenario
   */
  const initializeToppings = useCallback(() => {
    const toppingConfigs: ToppingConfiguration[] = [];

    // Step 1: Handle existing toppings from the cart item
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
            basePrice: availableTopping.is_premium ? 3.0 : 2.0,
          });
        }
      });
    }

    // Step 2: Add all other available toppings as "none"
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
          basePrice: availableTopping.is_premium ? 3.0 : 2.0,
        });
      }
    });

    setToppings(toppingConfigs);
  }, [availableToppings, item.selectedToppings]);

  /**
   * Initialize modifiers from available options and current selections
   */
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

  // Initialize when data becomes available
  useEffect(() => {
    if (availableToppings.length > 0) {
      initializeToppings();
    }
  }, [availableToppings, initializeToppings]);

  useEffect(() => {
    if (availableModifiers.length > 0) {
      initializeModifiers();
    }
  }, [availableModifiers, initializeModifiers]);

  // ==========================================
  // BUSINESS LOGIC FUNCTIONS
  // ==========================================

  /**
   * Calculate topping prices using your business rules
   * This encodes the important pricing logic that default toppings
   * don't cost extra unless you get "extra" amount
   */
  const calculateToppingPrice = (
    topping: ToppingConfiguration,
    amount: ToppingAmount,
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

  // Handle topping amount changes with real-time price calculation
  const handleToppingChange = (toppingId: string, newAmount: ToppingAmount) => {
    setToppings((prev) =>
      prev.map((topping) => {
        if (topping.id === toppingId) {
          const newPrice = calculateToppingPrice(
            topping,
            newAmount,
            topping.isDefault
          );
          return { ...topping, amount: newAmount, price: newPrice };
        }
        return topping;
      })
    );
  };

  // Handle modifier selection changes
  const handleModifierChange = (modifierId: string, selected: boolean) => {
    setModifiers((prev) =>
      prev.map((modifier) =>
        modifier.id === modifierId ? { ...modifier, selected } : modifier
      )
    );
  };

  // ==========================================
  // REAL-TIME PRICE CALCULATION
  // ==========================================

  const calculatedPrice = useMemo(() => {
    let total = item.basePrice;

    // Add crust premium (stuffed costs extra)
    if (selectedCrust === "Stuffed") {
      total += 2.0;
    }

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

    return Math.max(0, total);
  }, [selectedCrust, toppings, modifiers, item.basePrice]);

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

  // ==========================================
  // SAVE FUNCTIONALITY
  // ==========================================

  const handleSave = () => {
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
      displayName: `${item.variantName || ""} ${item.menuItemName}`.trim(),
    };

    onComplete(updatedItem);
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  // ==========================================
  // MODAL RENDER
  // ==========================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
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

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Crust Selection */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Crust Type
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableCrusts.map((crust) => (
                  <button
                    key={crust.name}
                    onClick={() => setSelectedCrust(crust.name)}
                    className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                      selectedCrust === crust.name
                        ? "border-blue-600 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900">
                        {crust.name}
                      </div>
                      {crust.premium && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          +$2.00
                        </span>
                      )}
                      {crust.special && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          On Request
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {crust.description}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Toppings by Category */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Toppings
              </h3>
              {Object.entries(toppingsByCategory).map(
                ([category, categoryToppings]) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-base font-medium text-gray-800 mb-2 capitalize flex items-center">
                      <span className="mr-2">
                        {category === "meats"
                          ? "🥓"
                          : category === "vegetables"
                          ? "🥬"
                          : category === "cheese"
                          ? "🧀"
                          : "🍅"}
                      </span>
                      {category}
                    </h4>
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
            </section>

            {/* Modifiers */}
            {modifiers.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Special Preparations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </section>
            )}

            {/* Special Instructions */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Special Instructions
              </h3>
              <textarea
                placeholder="Any special requests for this pizza..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </section>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Updated total:</div>
              <div className="text-xl font-bold text-green-600">
                ${calculatedPrice.toFixed(2)}
              </div>
            </div>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Update Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TOPPING SELECTOR COMPONENT
// ==========================================

interface ToppingSelectorProps {
  topping: ToppingConfiguration;
  onChange: (amount: ToppingAmount) => void;
}

function ToppingSelector({ topping, onChange }: ToppingSelectorProps) {
  const amountOptions: {
    value: ToppingAmount;
    label: string;
  }[] = [
    { value: "none", label: "None" },
    { value: "light", label: "Light" },
    { value: "normal", label: "Normal" },
    { value: "extra", label: "Extra" },
  ];

  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        topping.amount !== "none"
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
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

      <div className="grid grid-cols-4 gap-1">
        {amountOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              topping.amount === option.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MODIFIER SELECTOR COMPONENT
// ==========================================

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
          className="mr-3 text-blue-600 focus:ring-blue-500"
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

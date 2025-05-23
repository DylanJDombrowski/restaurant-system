// src/components/features/orders/ModalPizzaCustomizer.tsx
"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ConfiguredCartItem,
  Topping,
  Modifier,
  ToppingAmount,
  MenuItemWithVariants,
  MenuItemVariant,
} from "@/lib/types";

/**
 * ENHANCED Modal Pizza Customizer with Dynamic Crust Loading
 *
 * Major improvements:
 * 1. ✅ Loads crust options dynamically from variants instead of hardcoded
 * 2. ✅ Size-first workflow: show all sizes, then crust options for selected size
 * 3. ✅ Special handling for 10" gluten-free option
 * 4. ✅ Better pricing logic that accounts for size + crust combinations
 * 5. ✅ Maintains all existing topping and modifier functionality
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
  menuItemWithVariants,
  availableToppings,
  availableModifiers,
  onComplete,
  onCancel,
  isOpen,
}: ModalPizzaCustomizerProps) {
  // ==========================================
  // ENHANCED STATE MANAGEMENT
  // ==========================================

  const [toppings, setToppings] = useState<ToppingConfiguration[]>([]);
  const [modifiers, setModifiers] = useState<ModifierConfiguration[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    item.specialInstructions || ""
  );

  // 🆕 NEW: Dynamic size and crust selection
  const [selectedVariant, setSelectedVariant] =
    useState<MenuItemVariant | null>(null);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [availableCrusts, setAvailableCrusts] = useState<
    { value: string; label: string; variant: MenuItemVariant }[]
  >([]);
  const [selectedCrust, setSelectedCrust] = useState<string>("");

  // ==========================================
  // 🆕 DYNAMIC VARIANTS PROCESSING
  // ==========================================

  /**
   * Process variants to extract size and crust options
   * This creates the size-first, then crust workflow you requested
   */
  const processVariants = useCallback(() => {
    if (!menuItemWithVariants?.variants) return;

    // Get unique sizes in logical order
    const sizeOrder = { small: 1, medium: 2, large: 3, xlarge: 4 };
    const uniqueSizes = [
      ...new Set(menuItemWithVariants.variants.map((v) => v.size_code)),
    ].sort(
      (a, b) =>
        (sizeOrder[a as keyof typeof sizeOrder] || 999) -
        (sizeOrder[b as keyof typeof sizeOrder] || 999)
    );

    setAvailableSizes(uniqueSizes);

    // If item already has a variant selected, set it as default
    if (item.variantId) {
      const currentVariant = menuItemWithVariants.variants.find(
        (v) => v.id === item.variantId
      );
      if (currentVariant) {
        setSelectedVariant(currentVariant);
        setSelectedSize(currentVariant.size_code);
        setSelectedCrust(currentVariant.crust_type || "");
      }
    } else if (uniqueSizes.length > 0) {
      // Default to medium if available, otherwise first size
      const defaultSize = uniqueSizes.includes("medium")
        ? "medium"
        : uniqueSizes[0];
      setSelectedSize(defaultSize);
    }
  }, [menuItemWithVariants, item.variantId]);

  /**
   * Update available crust options when size changes
   */
  const updateAvailableCrusts = useCallback(() => {
    if (!menuItemWithVariants?.variants || !selectedSize) return;

    const crustsForSize = menuItemWithVariants.variants
      .filter((v) => v.size_code === selectedSize)
      .map((variant) => ({
        value: variant.crust_type || "thin",
        label: getCrustDisplayName(variant.crust_type || "thin", selectedSize),
        variant: variant,
      }));

    setAvailableCrusts(crustsForSize);

    // Auto-select first crust if none selected
    if (crustsForSize.length > 0 && !selectedCrust) {
      const defaultCrust =
        crustsForSize.find((c) => c.value === "thin")?.value ||
        crustsForSize[0].value;
      setSelectedCrust(defaultCrust);
    }

    // Update selected variant when size/crust combination changes
    const matchingVariant = crustsForSize.find(
      (c) => c.value === selectedCrust
    )?.variant;
    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
    }
  }, [menuItemWithVariants, selectedSize, selectedCrust]);

  /**
   * Get display name for crust types with special handling for 10" options
   */
  const getCrustDisplayName = (crustType: string, size: string): string => {
    const baseNames: Record<string, string> = {
      thin: "Thin Crust",
      double_dough: "Double Dough",
      extra_thin: "Extra Thin",
      gluten_free: "Gluten Free",
      stuffed: "Stuffed Crust",
    };

    const baseName = baseNames[crustType] || crustType;

    // Add special indicators for 10" options
    if (size === "small") {
      if (crustType === "gluten_free") {
        return `${baseName} (Available for 10" only)`;
      }
    }

    return baseName;
  };

  // Initialize variants processing
  useEffect(() => {
    processVariants();
  }, [processVariants]);

  // Update crusts when size changes
  useEffect(() => {
    updateAvailableCrusts();
  }, [updateAvailableCrusts]);

  // ==========================================
  // EXISTING TOPPING/MODIFIER LOGIC (unchanged)
  // ==========================================

  const initializeToppings = useCallback(() => {
    const toppingConfigs: ToppingConfiguration[] = [];

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
  // 🆕 ENHANCED PRICING CALCULATION
  // ==========================================

  const calculateToppingPrice = (
    topping: ToppingConfiguration,
    amount: ToppingAmount,
    isDefault: boolean
  ): number => {
    if (amount === "none") return 0;

    // Apply size multipliers for toppings
    const sizeMultipliers: Record<string, number> = {
      small: 0.8,
      medium: 1.0,
      large: 1.3,
      xlarge: 1.6,
    };

    const multiplier = sizeMultipliers[selectedSize] || 1.0;

    if (isDefault) {
      return amount === "extra" ? topping.basePrice * 0.5 * multiplier : 0;
    }

    const baseAmount = (() => {
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
    })();

    return baseAmount * multiplier;
  };

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

  const handleModifierChange = (modifierId: string, selected: boolean) => {
    setModifiers((prev) =>
      prev.map((modifier) =>
        modifier.id === modifierId ? { ...modifier, selected } : modifier
      )
    );
  };

  // ==========================================
  // 🆕 ENHANCED PRICE CALCULATION WITH VARIANTS
  // ==========================================

  const calculatedPrice = useMemo(() => {
    // Start with variant price (includes size + crust)
    let total = selectedVariant?.price || item.basePrice;

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
  }, [selectedVariant, toppings, modifiers, item.basePrice]);

  // Group toppings by category
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
  // SAVE FUNCTIONALITY WITH VARIANT SUPPORT
  // ==========================================

  const handleSave = () => {
    const updatedItem: ConfiguredCartItem = {
      ...item,
      // 🆕 Update variant information
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      basePrice: selectedVariant?.price || item.basePrice,
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
      displayName: selectedVariant
        ? `${selectedVariant.name} ${item.menuItemName}`
        : `${item.variantName || ""} ${item.menuItemName}`.trim(),
    };

    onComplete(updatedItem);
  };

  if (!isOpen) return null;

  // ==========================================
  // 🆕 ENHANCED MODAL RENDER WITH SIZE/CRUST SELECTION
  // ==========================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize {item.menuItemName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedVariant ? (
                <>
                  Selected:{" "}
                  <span className="font-medium">{selectedVariant.name}</span> -
                  ${selectedVariant.price.toFixed(2)}
                </>
              ) : (
                <>Base price: ${item.basePrice.toFixed(2)}</>
              )}
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
            {/* 🆕 SIZE SELECTION SECTION */}
            {availableSizes.length > 1 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Choose Size
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableSizes.map((size) => {
                    const sizeVariant = menuItemWithVariants?.variants?.find(
                      (v) => v.size_code === size && v.crust_type === "thin"
                    );
                    const sizeLabel =
                      sizeVariant?.name?.split(" ")[0] +
                        " " +
                        sizeVariant?.name?.split(" ")[1] || size;

                    return (
                      <button
                        key={size}
                        onClick={() => {
                          setSelectedSize(size);
                          setSelectedCrust(""); // Reset crust selection
                        }}
                        className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                          selectedSize === size
                            ? "border-blue-600 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold text-gray-900">
                          {sizeLabel}
                        </div>
                        {sizeVariant?.serves && (
                          <div className="text-sm text-gray-600">
                            {sizeVariant.serves}
                          </div>
                        )}
                        <div className="text-sm font-medium text-green-600 mt-1">
                          From ${sizeVariant?.price?.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 🆕 CRUST SELECTION SECTION */}
            {selectedSize && availableCrusts.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Choose Crust (
                  {selectedSize.charAt(0).toUpperCase() + selectedSize.slice(1)}
                  )
                </h3>
                <div className="space-y-3">
                  {availableCrusts.map((crust) => (
                    <label
                      key={crust.value}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedCrust === crust.value
                          ? "border-blue-600 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="crust"
                          value={crust.value}
                          checked={selectedCrust === crust.value}
                          onChange={() => setSelectedCrust(crust.value)}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {crust.label}
                          </div>
                          {crust.value === "double_dough" && (
                            <div className="text-sm text-gray-600">
                              Thick and hearty
                            </div>
                          )}
                          {crust.value === "gluten_free" && (
                            <div className="text-sm text-blue-600">
                              Special dietary option
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        ${crust.variant.price.toFixed(2)}
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* EXISTING: Toppings by Category */}
            {Object.keys(toppingsByCategory).length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Toppings
                  {selectedSize && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Prices adjusted for {selectedSize} size)
                    </span>
                  )}
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
            )}

            {/* EXISTING: Modifiers */}
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

            {/* EXISTING: Special Instructions */}
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
              disabled={!selectedVariant}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
// EXISTING HELPER COMPONENTS (unchanged)
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

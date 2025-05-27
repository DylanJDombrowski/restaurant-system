// src/components/features/orders/PizzaCustomizer.tsx
"use client";
import {
  ConfiguredCartItem,
  MenuItemVariant,
  MenuItemWithVariants,
  Modifier,
  Topping,
  ToppingAmount,
  Customization,
  CustomizationCategory,
  ItemCategory,
  PricingType,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * COMPLETE Enhanced Modal Pizza Customizer with Dynamic Size/Crust Selection
 *
 * Features:
 * ✅ Size-first workflow: Choose size → Choose crust → Customize toppings
 * ✅ Dynamic crust loading based on selected size
 * ✅ Size-based topping pricing multipliers
 * ✅ Proper state preservation from existing cart items
 * ✅ Enhanced UI with clear pricing feedback
 * ✅ Special handling for gluten-free and premium crusts
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

interface PizzaCustomizerProps {
  item: ConfiguredCartItem;
  menuItemWithVariants?: MenuItemWithVariants;
  availableToppings: Topping[]; // Legacy compatibility
  availableModifiers: Modifier[]; // Legacy compatibility
  availableCustomizations?: Customization[]; // NEW: Unified system
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function PizzaCustomizer({
  item,
  menuItemWithVariants,
  availableToppings,
  availableModifiers,
  availableCustomizations, // NEW: Accept customizations
  onComplete,
  onCancel,
  isOpen,
}: PizzaCustomizerProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [toppings, setToppings] = useState<ToppingConfiguration[]>([]);
  const [modifiers, setModifiers] = useState<ModifierConfiguration[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    item.specialInstructions || ""
  );

  // Size/Crust selection state
  const [selectedVariant, setSelectedVariant] =
    useState<MenuItemVariant | null>(null);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [availableCrusts, setAvailableCrusts] = useState<
    {
      value: string;
      label: string;
      variant: MenuItemVariant;
      isSpecial?: boolean;
    }[]
  >([]);
  const [selectedCrust, setSelectedCrust] = useState<string>("");

  // ==========================================
  // SIZE/CRUST PROCESSING
  // ==========================================

  const processVariants = useCallback(() => {
    if (!menuItemWithVariants?.variants) return;

    console.log(
      "🔧 Processing variants:",
      menuItemWithVariants.variants.length
    );

    // Get unique sizes in logical order
    const sizeOrder = { small: 1, medium: 2, large: 3, xlarge: 4 };
    const uniqueSizes = [
      ...new Set(menuItemWithVariants.variants.map((v) => v.size_code)),
    ].sort(
      (a, b) =>
        (sizeOrder[a as keyof typeof sizeOrder] || 999) -
        (sizeOrder[b as keyof typeof sizeOrder] || 999)
    );

    console.log("📏 Available sizes:", uniqueSizes);
    setAvailableSizes(uniqueSizes);

    // Set initial selection based on existing item or defaults
    if (item.variantId) {
      console.log("🔄 Restoring existing variant:", item.variantId);
      const currentVariant = menuItemWithVariants.variants.find(
        (v) => v.id === item.variantId
      );
      if (currentVariant) {
        setSelectedVariant(currentVariant);
        setSelectedSize(currentVariant.size_code);
        setSelectedCrust(currentVariant.crust_type || "thin");
        console.log("✅ Restored variant:", currentVariant.name);
      }
    } else if (uniqueSizes.length > 0) {
      // Default to medium if available, otherwise first size
      const defaultSize = uniqueSizes.includes("medium")
        ? "medium"
        : uniqueSizes[0];
      console.log("🎯 Setting default size:", defaultSize);
      setSelectedSize(defaultSize);
    }
  }, [menuItemWithVariants, item.variantId]);

  const updateAvailableCrusts = useCallback(() => {
    if (!menuItemWithVariants?.variants || !selectedSize) return;

    console.log("🍞 Updating crusts for size:", selectedSize);

    const crustsForSize = menuItemWithVariants.variants
      .filter((v) => v.size_code === selectedSize)
      .map((variant) => ({
        value: variant.crust_type || "thin",
        label: getCrustDisplayName(variant.crust_type || "thin", selectedSize),
        variant: variant,
        isSpecial:
          variant.crust_type === "gluten_free" ||
          variant.crust_type === "stuffed",
      }))
      .sort((a, b) => {
        // Sort: thin first, then double_dough, then special crusts
        const order = { thin: 1, double_dough: 2, gluten_free: 3, stuffed: 4 };
        return (
          (order[a.value as keyof typeof order] || 999) -
          (order[b.value as keyof typeof order] || 999)
        );
      });

    console.log(
      "🍞 Available crusts:",
      crustsForSize.map((c) => c.label)
    );
    setAvailableCrusts(crustsForSize);

    // Auto-select crust if none selected or if current selection is invalid
    if (
      !selectedCrust ||
      !crustsForSize.find((c) => c.value === selectedCrust)
    ) {
      const defaultCrust =
        crustsForSize.find((c) => c.value === "thin")?.value ||
        crustsForSize[0]?.value;
      if (defaultCrust) {
        console.log("🎯 Setting default crust:", defaultCrust);
        setSelectedCrust(defaultCrust);
      }
    }
  }, [menuItemWithVariants, selectedSize, selectedCrust]);

  // Update selected variant when size/crust combination changes
  useEffect(() => {
    if (selectedSize && selectedCrust && availableCrusts.length > 0) {
      const matchingVariant = availableCrusts.find(
        (c) => c.value === selectedCrust
      )?.variant;
      if (matchingVariant && matchingVariant.id !== selectedVariant?.id) {
        console.log("🔄 Updating selected variant:", matchingVariant.name);
        setSelectedVariant(matchingVariant);
      }
    }
  }, [selectedSize, selectedCrust, availableCrusts, selectedVariant?.id]);

  const getCrustDisplayName = (crustType: string, size: string): string => {
    const baseNames: Record<string, string> = {
      thin: "Thin Crust",
      double_dough: "Double Dough",
      extra_thin: "Extra Thin",
      gluten_free: "Gluten Free",
      stuffed: "Stuffed Crust",
    };

    const baseName = baseNames[crustType] || crustType.replace("_", " ");

    // Add special indicators
    if (crustType === "gluten_free") {
      return `${baseName} ${size === "small" ? '(10" only)' : ""}`;
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
  // TOPPING & MODIFIER INITIALIZATION
  // ==========================================

  // ==========================================
  // 🆕 ENHANCED TOPPING INITIALIZATION WITH NEW SYSTEM
  // ==========================================

  const initializeToppings = useCallback(() => {
    console.log("🍕 Initializing toppings...");
    const toppingConfigs: ToppingConfiguration[] = [];

    // 🆕 NEW: Use customizations if available, otherwise fall back to legacy
    const pizzaToppings = availableCustomizations
      ? availableCustomizations.filter(
          (c) =>
            c.category.startsWith("topping_") && c.applies_to.includes("pizza")
        )
      : [];

    // Process existing selected toppings
    if (item.selectedToppings) {
      console.log(
        "🔄 Processing existing toppings:",
        item.selectedToppings.length
      );
      item.selectedToppings.forEach((selectedTopping) => {
        // Try new system first
        let sourceTopping = pizzaToppings.find(
          (t) => t.id === selectedTopping.id
        );
        const isFromNewSystem = !!sourceTopping;

        // Fall back to legacy system
        if (!sourceTopping) {
          const legacyTopping = availableToppings.find(
            (t) => t.id === selectedTopping.id
          );
          if (legacyTopping) {
            sourceTopping = {
              ...legacyTopping,
              category: `topping_${
                legacyTopping.is_premium ? "premium" : "normal"
              }` as CustomizationCategory,
              applies_to: ["pizza"] as ItemCategory[],
              price_type: "multiplied" as PricingType,
              pricing_rules: {},
              sort_order: legacyTopping.sort_order,
              is_available: legacyTopping.is_available,
              description: "",
              created_at: legacyTopping.created_at,
              updated_at: legacyTopping.created_at,
            };
          }
        }

        if (sourceTopping) {
          toppingConfigs.push({
            id: selectedTopping.id,
            name: selectedTopping.name,
            amount: selectedTopping.amount,
            price: selectedTopping.price,
            isDefault: selectedTopping.isDefault,
            category: isFromNewSystem
              ? sourceTopping.category.replace("topping_", "")
              : selectedTopping.category || "",
            isPremium: isFromNewSystem
              ? sourceTopping.category === "topping_premium" ||
                sourceTopping.category === "topping_beef"
              : "is_premium" in sourceTopping
              ? (sourceTopping as Topping).is_premium
              : false,
            basePrice: sourceTopping.base_price,
          });
        }
      });
    }

    // Add missing toppings as "none"
    if (pizzaToppings.length > 0) {
      // NEW SYSTEM: Use customizations
      pizzaToppings.forEach((customization) => {
        const existing = toppingConfigs.find((t) => t.id === customization.id);
        if (!existing) {
          toppingConfigs.push({
            id: customization.id,
            name: customization.name,
            amount: "none",
            price: 0,
            isDefault: false,
            category: customization.category.replace("topping_", ""),
            isPremium:
              customization.category === "topping_premium" ||
              customization.category === "topping_beef",
            basePrice: customization.base_price,
          });
        }
      });
    } else {
      // LEGACY SYSTEM: Use old toppings
      availableToppings.forEach((availableTopping) => {
        const existing = toppingConfigs.find(
          (t) => t.id === availableTopping.id
        );
        if (!existing) {
          toppingConfigs.push({
            id: availableTopping.id,
            name: availableTopping.name,
            amount: "none",
            price: 0,
            isDefault: false,
            category: availableTopping.category,
            isPremium: availableTopping.is_premium,
            basePrice: availableTopping.base_price,
          });
        }
      });
    }

    console.log(
      "✅ Initialized toppings:",
      toppingConfigs.length,
      "- Using",
      pizzaToppings.length > 0 ? "NEW customizations system" : "legacy toppings"
    );
    setToppings(toppingConfigs);
  }, [availableToppings, availableCustomizations, item.selectedToppings]);

  const initializeModifiers = useCallback(() => {
    console.log("🔧 Initializing modifiers...");

    // 🆕 NEW: Use customizations if available, otherwise fall back to legacy
    const pizzaModifiers = availableCustomizations
      ? availableCustomizations.filter(
          (c) =>
            !c.category.startsWith("topping_") && c.applies_to.includes("pizza")
        )
      : availableModifiers;

    const modifierConfigs: ModifierConfiguration[] = pizzaModifiers.map(
      (mod) => ({
        id: mod.id,
        name: mod.name,
        priceAdjustment:
          "base_price" in mod
            ? mod.base_price
            : (mod as Modifier).price_adjustment,
        selected: item.selectedModifiers?.some((m) => m.id === mod.id) || false,
      })
    );

    console.log(
      "✅ Initialized modifiers:",
      modifierConfigs.length,
      "- Using",
      availableCustomizations ? "NEW customizations system" : "legacy modifiers"
    );
    setModifiers(modifierConfigs);
  }, [availableModifiers, availableCustomizations, item.selectedModifiers]);

  useEffect(() => {
    if (
      availableToppings.length > 0 ||
      (availableCustomizations && availableCustomizations.length > 0)
    ) {
      initializeToppings();
    }
  }, [availableToppings, availableCustomizations, initializeToppings]);

  useEffect(() => {
    if (
      availableModifiers.length > 0 ||
      (availableCustomizations && availableCustomizations.length > 0)
    ) {
      initializeModifiers();
    }
  }, [availableModifiers, availableCustomizations, initializeModifiers]);

  // ==========================================
  // PRICING CALCULATION
  // ==========================================

  const calculateToppingPrice = useCallback(
    (
      topping: ToppingConfiguration,
      amount: ToppingAmount,
      isDefault: boolean,
      variant?: MenuItemVariant | null
    ): number => {
      if (amount === "none") return 0;

      // Size multipliers based on your actual data
      const sizeMultipliers: Record<string, number> = {
        small: 0.865, // 10" - actual data shows 1.60/1.85 = 0.865
        medium: 1.0, // 12" - reference size
        large: 1.135, // 14" - actual data shows 2.10/1.85 = 1.135
        xlarge: 1.351, // 16" - actual data shows 2.50/1.85 = 1.351
      };

      const currentSize = variant?.size_code || selectedSize;
      const sizeMultiplier = sizeMultipliers[currentSize] || 1.0;

      // Amount multipliers
      const amountMultipliers: Record<ToppingAmount, number> = {
        none: 0,
        light: 1.0,
        normal: 1.0,
        extra: 2.0,
        xxtra: 3.0,
      };

      let basePrice = topping.basePrice;

      // Handle default toppings (usually cheaper for extra)
      if (isDefault && amount === "extra") {
        basePrice = basePrice * 0.5; // Default toppings cost less for extra
      } else if (isDefault && amount !== "extra") {
        return 0; // Default toppings are free at normal/light amounts
      }

      const finalPrice = basePrice * sizeMultiplier * amountMultipliers[amount];

      console.log(
        `💰 ${topping.name} (${amount}): ${basePrice} × ${sizeMultiplier} × ${
          amountMultipliers[amount]
        } = $${finalPrice.toFixed(2)}`
      );

      return Math.round(finalPrice * 100) / 100; // Round to nearest cent
    },
    [selectedSize]
  );

  const handleToppingChange = (toppingId: string, newAmount: ToppingAmount) => {
    console.log(`🍕 Changing ${toppingId} to ${newAmount}`);
    setToppings((prev) =>
      prev.map((topping) => {
        if (topping.id === toppingId) {
          const newPrice = calculateToppingPrice(
            topping,
            newAmount,
            topping.isDefault,
            selectedVariant
          );
          return { ...topping, amount: newAmount, price: newPrice };
        }
        return topping;
      })
    );
  };

  const handleModifierChange = (modifierId: string, selected: boolean) => {
    console.log(`🔧 Changing modifier ${modifierId} to ${selected}`);
    setModifiers((prev) =>
      prev.map((modifier) =>
        modifier.id === modifierId ? { ...modifier, selected } : modifier
      )
    );
  };

  // ==========================================
  // TOTAL PRICE CALCULATION
  // ==========================================

  const calculatedPrice = useMemo(() => {
    // Start with variant price (includes size + crust)
    let total = selectedVariant?.price || item.basePrice;

    // Add selected topping costs
    const toppingCost = toppings.reduce(
      (sum, topping) => sum + topping.price,
      0
    );

    // Add selected modifier costs
    const modifierCost = modifiers.reduce(
      (sum, modifier) =>
        sum + (modifier.selected ? modifier.priceAdjustment : 0),
      0
    );

    total = total + toppingCost + modifierCost;

    console.log(
      `💰 Price calculation: Base $${
        selectedVariant?.price || item.basePrice
      } + Toppings $${toppingCost.toFixed(
        2
      )} + Modifiers $${modifierCost.toFixed(2)} = $${total.toFixed(2)}`
    );

    return Math.max(0, Math.round(total * 100) / 100);
  }, [selectedVariant, toppings, modifiers, item.basePrice]);

  // Group toppings by category for display
  const toppingsByCategory = useMemo(() => {
    return toppings.reduce((acc, topping) => {
      const category = topping.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(topping);
      return acc;
    }, {} as Record<string, ToppingConfiguration[]>);
  }, [toppings]);

  // ==========================================
  // SAVE FUNCTIONALITY
  // ==========================================

  const handleSave = () => {
    if (!selectedVariant) {
      console.error("❌ Cannot save without selected variant");
      return;
    }

    console.log("💾 Saving pizza customization...");

    const updatedItem: ConfiguredCartItem = {
      ...item,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      basePrice: selectedVariant.price,
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
      displayName: `${selectedVariant.name} ${item.menuItemName}`,
    };

    console.log("✅ Saved pizza:", updatedItem);
    onComplete(updatedItem);
  };

  const isReadyToSave = selectedVariant !== null;

  if (!isOpen) return null;

  // ==========================================
  // RENDER
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
                <>Choose size and crust to continue</>
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
            {/* SIZE SELECTION SECTION */}
            {availableSizes.length > 1 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Step 1: Choose Size
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableSizes.map((size) => {
                    // Find a representative variant for this size (preferably thin crust)
                    const sizeVariant =
                      menuItemWithVariants?.variants?.find(
                        (v) =>
                          v.size_code === size &&
                          (v.crust_type === "thin" || !v.crust_type)
                      ) ||
                      menuItemWithVariants?.variants?.find(
                        (v) => v.size_code === size
                      );

                    if (!sizeVariant) return null;

                    const sizeLabel = sizeVariant.name
                      .split(" ")
                      .slice(0, 2)
                      .join(" "); // "Small 10\"" or "Medium 12\""
                    const fromPrice = Math.min(
                      ...(menuItemWithVariants?.variants
                        ?.filter((v) => v.size_code === size)
                        .map((v) => v.price) || [sizeVariant.price])
                    );

                    return (
                      <button
                        key={size}
                        onClick={() => {
                          console.log("📏 Selected size:", size);
                          setSelectedSize(size);
                          setSelectedCrust(""); // Reset crust selection
                        }}
                        className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                          selectedSize === size
                            ? "border-blue-600 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold text-gray-900">
                          {sizeLabel}
                        </div>
                        {sizeVariant.serves && (
                          <div className="text-sm text-gray-600 mt-1">
                            {sizeVariant.serves}
                          </div>
                        )}
                        <div className="text-sm font-medium text-green-600 mt-2">
                          From ${fromPrice.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* CRUST SELECTION SECTION */}
            {selectedSize && availableCrusts.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Step 2: Choose Crust (
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
                      onClick={() => {
                        console.log("🍞 Selected crust:", crust.value);
                        setSelectedCrust(crust.value);
                      }}
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
                          <div className="font-semibold text-gray-900 flex items-center">
                            {crust.label}
                            {crust.isSpecial && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                Special
                              </span>
                            )}
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

            {/* TOPPINGS SECTION */}
            {selectedVariant && Object.keys(toppingsByCategory).length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Step 3: Choose Toppings
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (Prices adjusted for {selectedSize} size)
                  </span>
                </h3>
                {Object.entries(toppingsByCategory).map(
                  ([category, categoryToppings]) => (
                    <div key={category} className="mb-6">
                      <h4 className="text-base font-medium text-gray-800 mb-3 capitalize flex items-center">
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

            {/* MODIFIERS SECTION */}
            {selectedVariant && modifiers.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Step 4: Special Preparations
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

            {/* SPECIAL INSTRUCTIONS */}
            {selectedVariant && (
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
            )}
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
              <div className="text-sm text-gray-600">Total:</div>
              <div className="text-xl font-bold text-green-600">
                ${calculatedPrice.toFixed(2)}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!isReadyToSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isReadyToSave ? "Update Cart" : "Choose Size & Crust"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// HELPER COMPONENTS
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
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{topping.name}</span>
          {topping.isDefault && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Default
            </span>
          )}
          {topping.isPremium && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
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

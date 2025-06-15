// src/components/features/orders/ChickenCustomizer.tsx - FIXED VERSION
"use client";

import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ConfiguredCartItem, ConfiguredModifier, Customization, MenuItemVariant, MenuItemWithVariants } from "@/lib/types";
import { useChickenCustomization } from "@/lib/utils/chicken-customization";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ChickenCustomizerProps {
  item: MenuItemWithVariants;
  selectedVariant?: MenuItemVariant;
  existingCartItem?: ConfiguredCartItem | null;
  onComplete: (configuredItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

interface WhiteMeatTier {
  id: string;
  name: string;
  level: "none" | "normal" | "extra" | "xxtra";
  multiplier: number;
  price: number;
}

export default function ChickenCustomizer({
  item,
  selectedVariant,
  existingCartItem,
  onComplete,
  onCancel,
  isOpen,
  restaurantId,
}: ChickenCustomizerProps) {
  // --- 1. STATE MANAGEMENT ---
  const [currentVariant, setCurrentVariant] = useState<MenuItemVariant | null>(
    selectedVariant || (item.variants && item.variants[0]) || null
  );
  const [allCustomizations, setAllCustomizations] = useState<Customization[]>([]);
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [selectedWhiteMeatTier, setSelectedWhiteMeatTier] = useState<WhiteMeatTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- 2. MEMOIZED VALUES & HOOKS ---
  const stableVariant = useMemo(() => currentVariant, [currentVariant]);
  const { availableCustomizations, whiteMeatTiers, defaultSelections, validate } = useChickenCustomization(
    stableVariant!,
    allCustomizations,
    restaurantId
  );

  // --- 3. PRICE CALCULATION FUNCTION (DIRECT, NOT IN useEffect) ---
  const recalculatePrice = useCallback(() => {
    if (!currentVariant || !isInitialized) {
      console.log("❌ Cannot calculate price - missing variant or not initialized");
      return;
    }

    console.log("💰 Recalculating chicken price...", {
      variantName: currentVariant.name,
      variantPrice: currentVariant.price,
      whiteMeatTier: selectedWhiteMeatTier?.name,
      customizations: selectedCustomizations.length,
    });

    let newPrice = currentVariant.price;

    // Add white meat tier price
    if (selectedWhiteMeatTier && selectedWhiteMeatTier.level !== "none") {
      newPrice += selectedWhiteMeatTier.price;
      console.log(`+ White meat (${selectedWhiteMeatTier.name}): +$${selectedWhiteMeatTier.price}`);
    }

    // Add customizations price
    selectedCustomizations.forEach((id) => {
      const custom = allCustomizations.find((c) => c.id === id);
      if (custom) {
        // Don't double-count white meat if it's also in customizations
        const isWhiteMeatCustomization = custom.name.toLowerCase().includes("white meat");
        if (!isWhiteMeatCustomization) {
          newPrice += custom.base_price;
          console.log(`+ ${custom.name}: +$${custom.base_price}`);
        }
      }
    });

    console.log("✅ Final calculated price:", newPrice);
    setCurrentPrice(newPrice);
  }, [currentVariant, isInitialized, selectedWhiteMeatTier, selectedCustomizations, allCustomizations]);

  // --- 4. DATA LOADING EFFECT (SIMPLIFIED) ---
  useEffect(() => {
    if (!isOpen) return;

    console.log("🔄 Loading chicken customization data...");
    setLoading(true);
    setIsInitialized(false);

    const loadData = async () => {
      try {
        const response = await fetch(`/api/menu/customization?restaurant_id=${restaurantId}&applies_to=chicken`);
        if (response.ok) {
          const data = await response.json();
          setAllCustomizations(data.data || []);
          console.log("✅ Loaded customizations:", data.data?.length || 0);
        } else {
          console.error("❌ Failed to load customizations:", response.status);
        }
      } catch (error) {
        console.error("❌ Error loading customizations:", error);
      }
      setLoading(false);
    };

    loadData();
  }, [isOpen, restaurantId]);

  // --- 5. INITIALIZATION EFFECT (RUNS AFTER DATA LOADS) ---
  useEffect(() => {
    if (loading || !isOpen || isInitialized || whiteMeatTiers.length === 0) {
      return;
    }

    console.log("🚀 Initializing chicken customizer...", {
      hasExistingItem: !!existingCartItem,
      whiteMeatTiersCount: whiteMeatTiers.length,
      defaultSelectionsCount: defaultSelections.length,
    });

    if (existingCartItem) {
      // Restore existing cart item state
      setQuantity(existingCartItem.quantity);
      setSpecialInstructions(existingCartItem.specialInstructions || "");

      const modifierIds = existingCartItem.selectedModifiers?.map((m) => m.id) || [];
      setSelectedCustomizations(modifierIds);

      // Find white meat tier from existing modifiers
      const whiteMeatModifier = existingCartItem.selectedModifiers?.find((m) => m.name.toLowerCase().includes("white meat"));

      let tierLevel: WhiteMeatTier["level"] = "none";
      if (whiteMeatModifier) {
        if (whiteMeatModifier.name.includes("XXtra")) tierLevel = "xxtra";
        else if (whiteMeatModifier.name.includes("Extra")) tierLevel = "extra";
        else tierLevel = "normal";
      }

      const restoredTier = whiteMeatTiers.find((t) => t.level === tierLevel) || whiteMeatTiers[0];
      setSelectedWhiteMeatTier(restoredTier);

      console.log("🔄 Restored existing item:", {
        quantity: existingCartItem.quantity,
        modifiers: modifierIds.length,
        whiteMeatTier: restoredTier.name,
      });
    } else {
      // Set defaults for new item
      const defaultCustomizationIds = defaultSelections.map((d) => d.id);
      setSelectedCustomizations(defaultCustomizationIds);

      const defaultWhiteMeatTier = whiteMeatTiers.find((t) => t.level === "none") || whiteMeatTiers[0];
      setSelectedWhiteMeatTier(defaultWhiteMeatTier);

      console.log("🆕 Set defaults for new item:", {
        defaultCustomizations: defaultCustomizationIds.length,
        whiteMeatTier: defaultWhiteMeatTier.name,
      });
    }

    setIsInitialized(true);

    // Price will be calculated by the useEffect that watches state changes
  }, [loading, isOpen, isInitialized, existingCartItem, whiteMeatTiers, defaultSelections]);

  // --- 6. PRICE UPDATE EFFECT (RELIABLE STATE-DRIVEN) ---
  useEffect(() => {
    if (isInitialized) {
      console.log("🔄 State changed, recalculating price...", {
        variant: currentVariant?.name,
        whiteMeat: selectedWhiteMeatTier?.name,
        customizations: selectedCustomizations.length,
      });
      recalculatePrice();
    }
  }, [isInitialized, currentVariant, selectedWhiteMeatTier, selectedCustomizations, recalculatePrice]);

  // --- 7. VALIDATION EFFECT ---
  useEffect(() => {
    if (!isInitialized) return;

    const validation = validate(selectedWhiteMeatTier, selectedCustomizations);
    setValidationErrors(validation.errors);
  }, [selectedWhiteMeatTier, selectedCustomizations, validate, isInitialized]);

  // --- 7. EVENT HANDLERS (WITH DIRECT PRICE UPDATES) ---
  const handleVariantChange = useCallback(
    (variantId: string) => {
      const variant = item.variants?.find((v) => v.id === variantId);
      if (variant && variant.id !== currentVariant?.id) {
        console.log("🔄 Changing variant:", variant.name);
        setCurrentVariant(variant);
        setSelectedCustomizations([]);
        setSelectedWhiteMeatTier(null);
        setIsInitialized(false); // Will trigger re-initialization
      }
    },
    [item.variants, currentVariant?.id]
  );

  const handleWhiteMeatTierChange = useCallback((tier: WhiteMeatTier) => {
    console.log("🍗 Changing white meat tier:", tier.name);
    setSelectedWhiteMeatTier(tier);
  }, []);

  const handleCustomizationToggle = useCallback(
    (customizationId: string, category: "sides" | "preparation" | "condiments") => {
      console.log("🔧 Toggling customization:", customizationId, category);

      setSelectedCustomizations((prev) => {
        if (category === "preparation") {
          // Radio button behavior for preparation
          const preparationIds = availableCustomizations.preparation.map((p) => p.id);
          const withoutPreparation = prev.filter((id) => !preparationIds.includes(id));
          return [...withoutPreparation, customizationId];
        } else {
          // Checkbox behavior for sides and condiments
          return prev.includes(customizationId) ? prev.filter((id) => id !== customizationId) : [...prev, customizationId];
        }
      });
    },
    [availableCustomizations.preparation]
  );

  const handleComplete = useCallback(() => {
    if (!currentVariant) return;

    // Final price calculation for the cart item
    let finalPrice = currentVariant.price;
    if (selectedWhiteMeatTier && selectedWhiteMeatTier.level !== "none") {
      finalPrice += selectedWhiteMeatTier.price;
    }

    selectedCustomizations.forEach((id) => {
      const custom = allCustomizations.find((c) => c.id === id);
      if (custom) {
        const isWhiteMeatCustomization = custom.name.toLowerCase().includes("white meat");
        if (!isWhiteMeatCustomization) {
          finalPrice += custom.base_price;
        }
      }
    });

    // Validate before completing
    const validation = validate(selectedWhiteMeatTier, selectedCustomizations);
    if (!validation.isValid) {
      alert("Please fix the following issues:\n" + validation.errors.join("\n"));
      return;
    }

    // Build configured modifiers
    const configuredModifiers: ConfiguredModifier[] = selectedCustomizations
      .map((id) => {
        const custom = allCustomizations.find((c) => c.id === id);
        return custom
          ? {
              id: custom.id,
              name: custom.name,
              priceAdjustment: custom.base_price,
            }
          : null;
      })
      .filter((m): m is ConfiguredModifier => m !== null);

    // Add white meat tier as modifier if not "none"
    if (selectedWhiteMeatTier && selectedWhiteMeatTier.level !== "none") {
      configuredModifiers.push({
        id: `white_meat_${selectedWhiteMeatTier.level}`,
        name: selectedWhiteMeatTier.name,
        priceAdjustment: selectedWhiteMeatTier.price,
      });
    }

    const configuredItem: ConfiguredCartItem = {
      id: existingCartItem?.id || `${item.id}-${currentVariant.id}-${Date.now()}`,
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      quantity,
      basePrice: currentVariant.price,
      selectedToppings: [],
      selectedModifiers: configuredModifiers,
      specialInstructions,
      totalPrice: finalPrice,
      displayName: `${item.name} (${currentVariant.name})`,
    };

    console.log("✅ Completing chicken customization:", {
      finalPrice,
      modifiers: configuredModifiers.length,
      quantity,
    });

    onComplete(configuredItem);
  }, [
    currentVariant,
    selectedWhiteMeatTier,
    selectedCustomizations,
    allCustomizations,
    validate,
    quantity,
    specialInstructions,
    existingCartItem,
    item,
    onComplete,
  ]);

  // --- 8. RENDER LOGIC ---
  if (loading) {
    <LoadingScreen />;
  }

  if (!isOpen || !currentVariant) return null;

  const totalPrice = currentPrice * quantity;
  const hasValidationErrors = validationErrors.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
              <p className="text-lg text-green-600 font-semibold">
                ${totalPrice.toFixed(2)}
                {quantity > 1 && (
                  <span className="text-sm text-gray-900 ml-2">
                    ({quantity} × ${currentPrice.toFixed(2)})
                  </span>
                )}
              </p>
              {hasValidationErrors && <div className="mt-2 text-sm text-red-600">{validationErrors.join(", ")}</div>}
            </div>
            <button onClick={onCancel} className="text-gray-900 hover:text-gray-900 text-2xl font-bold transition-colors">
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Variant Selection */}
          {item.variants && item.variants.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Size</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {item.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => handleVariantChange(variant.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      currentVariant?.id === variant.id
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-semibold">{variant.name}</div>
                    {variant.serves && <div className="text-sm text-gray-900">{variant.serves}</div>}
                    <div className="text-lg font-bold text-green-600 mt-1">${variant.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* White Meat Selection */}
          {whiteMeatTiers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🍗 White Meat Options *</h3>
              <div className="space-y-3">
                {whiteMeatTiers.map((tier) => (
                  <label
                    key={tier.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedWhiteMeatTier?.id === tier.id
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="whiteMeatTier"
                      checked={selectedWhiteMeatTier?.id === tier.id}
                      onChange={() => handleWhiteMeatTierChange(tier)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1 font-medium">{tier.name}</span>
                    {tier.price > 0 && <span className="text-green-600 font-semibold">+${tier.price.toFixed(2)}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sides Selection */}
          {availableCustomizations.sides.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🥔 Sides</h3>
              <div className="space-y-3">
                {availableCustomizations.sides.map((side) => (
                  <label
                    key={side.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCustomizations.includes(side.id)
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCustomizations.includes(side.id)}
                      onChange={() => handleCustomizationToggle(side.id, "sides")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{side.name}</span>
                    {side.base_price > 0 && <span className="text-green-600 font-semibold">+${side.base_price.toFixed(2)}</span>}
                    {side.base_price === 0 && side.name.toLowerCase().includes("included") && (
                      <span className="text-blue-600 font-semibold text-sm">INCLUDED</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preparation Options */}
          {availableCustomizations.preparation.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👨‍🍳 Preparation</h3>
              <div className="space-y-3">
                {availableCustomizations.preparation.map((prep) => (
                  <label
                    key={prep.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCustomizations.includes(prep.id)
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="preparation"
                      checked={selectedCustomizations.includes(prep.id)}
                      onChange={() => handleCustomizationToggle(prep.id, "preparation")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{prep.name}</span>
                    {prep.base_price > 0 && <span className="text-green-600 font-semibold">+${prep.base_price.toFixed(2)}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Condiments */}
          {availableCustomizations.condiments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🧄 Condiments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableCustomizations.condiments.map((condiment) => (
                  <label
                    key={condiment.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCustomizations.includes(condiment.id)
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCustomizations.includes(condiment.id)}
                      onChange={() => handleCustomizationToggle(condiment.id, "condiments")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{condiment.name}</span>
                    {condiment.base_price > 0 && <span className="text-green-600 font-semibold">+${condiment.base_price.toFixed(2)}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Quantity and Special Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Quantity</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Special Instructions</label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={hasValidationErrors || !isInitialized}
              className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {!isInitialized ? "Loading..." : `Add to Cart - $${totalPrice.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

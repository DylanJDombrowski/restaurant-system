// src/components/features/orders/ChickenCustomizer.tsx - FIXED: No any types
"use client";

import { ConfiguredCartItem, Customization, MenuItemVariant, MenuItemWithVariants } from "@/lib/types";
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
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
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
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ==========================================
  // STABLE VARIANT REFERENCE
  // ==========================================
  const stableVariant = useMemo(() => {
    return (
      currentVariant || {
        id: "",
        menu_item_id: "",
        name: "",
        price: 0,
        size_code: "",
        sort_order: 0,
        is_available: true,
        prep_time_minutes: 0,
        white_meat_upcharge: 0,
      }
    );
  }, [currentVariant]);

  // ==========================================
  // DATA LOADING
  // ==========================================
  useEffect(() => {
    let mounted = true;

    const loadCustomizations = async () => {
      if (!isOpen) return;

      try {
        setLoading(true);
        console.log("🐔 Loading chicken customizations...");

        const response = await fetch(`/api/menu/customization?restaurant_id=${restaurantId}&applies_to=chicken`);

        if (response.ok && mounted) {
          const data = await response.json();
          console.log("🐔 Loaded customizations:", data.data?.length || 0);
          setAllCustomizations(data.data || []);
        } else if (mounted) {
          console.error("Failed to load customizations:", response.status);
          setAllCustomizations([]);
        }
      } catch (error) {
        if (mounted) {
          console.error("Customization loading error:", error);
          setAllCustomizations([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCustomizations();

    return () => {
      mounted = false;
    };
  }, [isOpen, restaurantId]);

  // ==========================================
  // CHICKEN CUSTOMIZATION HOOK
  // ==========================================
  const { availableCustomizations, whiteMeatTiers, defaultSelections, calculatePrice, validate } = useChickenCustomization(
    stableVariant,
    allCustomizations,
    restaurantId
  );

  // ==========================================
  // INITIALIZATION & RESTORATION
  // ==========================================
  useEffect(() => {
    if (!isOpen || !currentVariant || loading) return;

    console.log("🔄 Initializing chicken customizer state");

    if (existingCartItem) {
      // Restore existing cart item
      console.log("📦 Restoring existing cart item");
      setQuantity(existingCartItem.quantity);
      setSpecialInstructions(existingCartItem.specialInstructions || "");

      const modifierIds = existingCartItem.selectedModifiers?.map((m) => m.id) || [];
      setSelectedCustomizations(modifierIds);

      // Restore white meat tier
      const whiteMeatModifier = existingCartItem.selectedModifiers?.find((m) => m.name.toLowerCase().includes("white meat"));

      if (whiteMeatModifier) {
        let tierLevel: "none" | "normal" | "extra" | "xxtra" = "none";

        if (whiteMeatModifier.name.includes("XXtra")) {
          tierLevel = "xxtra";
        } else if (whiteMeatModifier.name.includes("Extra")) {
          tierLevel = "extra";
        } else if (whiteMeatModifier.name.includes("White Meat")) {
          tierLevel = "normal";
        }

        const tier = whiteMeatTiers.find((t) => t.level === tierLevel);
        setSelectedWhiteMeatTier(tier || null);
      } else {
        setSelectedWhiteMeatTier(whiteMeatTiers.find((t) => t.level === "none") || null);
      }
    } else {
      // Set smart defaults for new item
      console.log("🆕 Setting defaults for new item");

      // Set default customizations (but not white meat - force user choice)
      setSelectedCustomizations(defaultSelections.map((d) => d.id));
      setSelectedWhiteMeatTier(null); // Force explicit choice
    }
  }, [isOpen, currentVariant, loading, existingCartItem, defaultSelections, whiteMeatTiers]);

  // ==========================================
  // PRICE CALCULATION WITH DEBOUNCING
  // ==========================================
  const updatePrice = useCallback(async () => {
    if (!currentVariant || isCalculatingPrice) return;

    try {
      setIsCalculatingPrice(true);
      const price = await calculatePrice(selectedWhiteMeatTier, selectedCustomizations);
      setCurrentPrice(price);
      console.log("💰 Price updated:", price);
    } catch (error) {
      console.error("Price calculation error:", error);
      setCurrentPrice(currentVariant.price); // Fallback to base price
    } finally {
      setIsCalculatingPrice(false);
    }
  }, [currentVariant, selectedWhiteMeatTier, selectedCustomizations, calculatePrice, isCalculatingPrice]);

  // Debounced price update
  useEffect(() => {
    const timeoutId = setTimeout(updatePrice, 300);
    return () => clearTimeout(timeoutId);
  }, [updatePrice]);

  // ==========================================
  // VALIDATION WITH REAL-TIME FEEDBACK
  // ==========================================
  useEffect(() => {
    const validation = validate(selectedWhiteMeatTier, selectedCustomizations);
    setValidationErrors(validation.errors);
  }, [selectedWhiteMeatTier, selectedCustomizations, validate]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  const handleVariantChange = useCallback(
    (variantId: string) => {
      const variant = item.variants?.find((v) => v.id === variantId);
      if (variant) {
        console.log("🔄 Variant changed:", variant.name);
        setCurrentVariant(variant);
        // Reset selections when variant changes
        setSelectedCustomizations([]);
        setSelectedWhiteMeatTier(null);
      }
    },
    [item.variants]
  );

  const handleWhiteMeatTierChange = useCallback((tier: WhiteMeatTier) => {
    console.log("🍗 White meat tier selected:", tier.name);
    setSelectedWhiteMeatTier(tier);
  }, []);

  const handleCustomizationToggle = useCallback(
    (customizationId: string, category: "sides" | "preparation" | "condiments") => {
      setSelectedCustomizations((prev) => {
        if (category === "preparation") {
          // Radio behavior for preparation - only one allowed
          const preparationIds = availableCustomizations.preparation.map((p) => p.id);
          const withoutPreparation = prev.filter((id) => !preparationIds.includes(id));
          return [...withoutPreparation, customizationId];
        } else {
          // Checkbox behavior for sides and condiments
          if (prev.includes(customizationId)) {
            return prev.filter((id) => id !== customizationId);
          } else {
            return [...prev, customizationId];
          }
        }
      });
    },
    [availableCustomizations.preparation]
  );

  const handleComplete = useCallback(() => {
    if (!currentVariant) return;

    const validation = validate(selectedWhiteMeatTier, selectedCustomizations);
    if (!validation.isValid) {
      alert("Please fix the following issues:\n" + validation.errors.join("\n"));
      return;
    }

    // Build configured modifiers
    const configuredModifiers = selectedCustomizations
      .map((id) => {
        const customization = allCustomizations.find((c) => c.id === id);
        return customization
          ? {
              id: customization.id,
              name: customization.name,
              priceAdjustment: customization.base_price,
            }
          : null;
      })
      .filter((modifier): modifier is { id: string; name: string; priceAdjustment: number } => modifier !== null);

    // Add white meat tier as modifier (if not "none")
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
      selectedToppings: [], // Not applicable for chicken
      selectedModifiers: configuredModifiers,
      specialInstructions,
      totalPrice: currentPrice,
      displayName: `${item.name} (${currentVariant.name})`,
    };

    console.log("✅ Chicken customization completed:", configuredItem);
    onComplete(configuredItem);
  }, [
    currentVariant,
    validate,
    selectedWhiteMeatTier,
    selectedCustomizations,
    allCustomizations,
    existingCartItem?.id,
    item,
    quantity,
    specialInstructions,
    currentPrice,
    onComplete,
  ]);

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chicken options...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen || !currentVariant) return null;

  const totalPrice = currentPrice * quantity;
  const hasValidationErrors = validationErrors.length > 0;

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
              <p className="text-lg text-green-600 font-semibold">
                {isCalculatingPrice ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                    Calculating...
                  </span>
                ) : (
                  `$${totalPrice.toFixed(2)}`
                )}
                {quantity > 1 && !isCalculatingPrice && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({quantity} × ${currentPrice.toFixed(2)})
                  </span>
                )}
              </p>
              {hasValidationErrors && <div className="mt-2 text-sm text-red-600">Please complete all required selections</div>}
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors">
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
                    {variant.serves && <div className="text-sm text-gray-600">{variant.serves}</div>}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
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
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={hasValidationErrors || isCalculatingPrice}
              className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCalculatingPrice ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Calculating...
                </span>
              ) : (
                `Add to Cart - ${totalPrice.toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

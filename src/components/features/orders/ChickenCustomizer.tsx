// ==================================================
// CORRECTED CHICKEN CUSTOMIZER WITH PROPER TYPES
// ==================================================

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MenuItemWithVariants,
  MenuItemVariant,
  ConfiguredCartItem,
  Modifier,
  ConfiguredModifier,
} from "@/lib/types";
import { useChickenCustomization } from "@/lib/utils/variant-modifier-system";

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
  const [allModifiers, setAllModifiers] = useState<Modifier[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<
    ConfiguredModifier[]
  >([]);
  const [selectedWhiteMeatTier, setSelectedWhiteMeatTier] =
    useState<WhiteMeatTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [loading, setLoading] = useState(true);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadModifiers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/menu/modifiers?restaurant_id=${restaurantId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAllModifiers(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load modifiers:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (isOpen) {
      loadModifiers();
    }
  }, [isOpen, loadModifiers]);

  // ==========================================
  // VARIANT-AWARE MODIFIER SYSTEM
  // ==========================================

  // Always call the hook, but handle empty data gracefully
  const chickenCustomizationData = useChickenCustomization(
    currentVariant || {
      id: "",
      menu_item_id: "",
      name: "",
      price: 0,
      serves: "",
      sort_order: 0,
      is_available: true,
      prep_time_minutes: 0,
      size_code: "",
    },
    allModifiers
  );

  // Use the data directly, with fallbacks for safety
  const {
    availableModifiers,
    whiteMeatTiers,
    defaultSelections,
    calculatePrice,
    validate,
  } =
    currentVariant && allModifiers.length > 0
      ? chickenCustomizationData
      : {
          availableModifiers: {
            whiteMeat: [],
            sides: [],
            preparation: [],
            condiments: [],
          },
          whiteMeatTiers: [],
          defaultSelections: [],
          calculatePrice: () => 0,
          validate: () => ({ isValid: true, errors: [], warnings: [] }),
        };

  // ==========================================
  // EFFECTS FOR SETTING DEFAULTS AND EXISTING STATE
  // ==========================================

  useEffect(() => {
    // Set defaults when variant changes or modifiers load
    if (currentVariant && defaultSelections.length > 0 && !existingCartItem) {
      console.log("🐔 Setting default selections for", currentVariant.name);
      setSelectedModifiers(defaultSelections);

      // Set default white meat tier to "none" (all dark meat)
      const noneTier = whiteMeatTiers.find((t) => t.level === "none");
      if (noneTier) {
        setSelectedWhiteMeatTier(noneTier);
      }
    }
  }, [currentVariant, defaultSelections, whiteMeatTiers, existingCartItem]);

  useEffect(() => {
    // Restore existing cart item state
    if (existingCartItem && currentVariant) {
      console.log("🔄 Restoring existing cart item state");
      setQuantity(existingCartItem.quantity);
      setSpecialInstructions(existingCartItem.specialInstructions || "");
      setSelectedModifiers(existingCartItem.selectedModifiers || []);

      // Try to determine white meat tier from existing modifiers
      const whiteMeatMod = existingCartItem.selectedModifiers?.find((m) =>
        m.name.includes("White Meat")
      );
      if (whiteMeatMod) {
        const tier = whiteMeatTiers.find((t) => t.id === whiteMeatMod.id);
        if (tier) {
          setSelectedWhiteMeatTier(tier);
        }
      }
    }
  }, [existingCartItem, currentVariant, whiteMeatTiers]);

  // ==========================================
  // PRICE CALCULATION
  // ==========================================

  const itemPrice = useMemo(() => {
    if (!currentVariant) return 0;
    return calculatePrice(selectedModifiers, selectedWhiteMeatTier);
  }, [
    currentVariant,
    selectedModifiers,
    selectedWhiteMeatTier,
    calculatePrice,
  ]);

  const totalPrice = itemPrice * quantity;

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleVariantChange = useCallback(
    (variantId: string) => {
      const variant = item.variants?.find((v) => v.id === variantId);
      if (variant) {
        console.log("🔄 Variant changed to:", variant.name);
        setCurrentVariant(variant);
        // Reset selections when variant changes
        setSelectedModifiers([]);
        setSelectedWhiteMeatTier(null);
      }
    },
    [item.variants]
  );

  const handleWhiteMeatTierChange = useCallback((tier: WhiteMeatTier) => {
    console.log("🍗 White meat tier changed to:", tier.name);
    setSelectedWhiteMeatTier(tier);
  }, []);

  const handleModifierToggle = useCallback((modifier: Modifier) => {
    setSelectedModifiers((prev) => {
      const existing = prev.find((m) => m.id === modifier.id);

      if (existing) {
        // Remove modifier
        return prev.filter((m) => m.id !== modifier.id);
      } else {
        // Add modifier
        return [
          ...prev,
          {
            id: modifier.id,
            name: modifier.name,
            priceAdjustment: modifier.price_adjustment,
          },
        ];
      }
    });
  }, []);

  const handleComplete = useCallback(() => {
    if (!currentVariant) return;

    const validation = validate(selectedModifiers, selectedWhiteMeatTier);
    if (!validation.isValid) {
      alert(
        "Please fix the following issues:\n" + validation.errors.join("\n")
      );
      return;
    }

    // Build final modifier list including white meat tier
    const finalModifiers = [...selectedModifiers];
    if (selectedWhiteMeatTier && selectedWhiteMeatTier.level !== "none") {
      const whiteMeatModifier = availableModifiers.whiteMeat.find(
        (m) => m.id === selectedWhiteMeatTier.id
      );
      if (whiteMeatModifier) {
        finalModifiers.push({
          id: whiteMeatModifier.id,
          name: selectedWhiteMeatTier.name,
          priceAdjustment:
            whiteMeatModifier.price_adjustment *
            selectedWhiteMeatTier.multiplier,
        });
      }
    }

    const configuredItem: ConfiguredCartItem = {
      id:
        existingCartItem?.id || `${item.id}-${currentVariant.id}-${Date.now()}`,
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      quantity,
      basePrice: currentVariant.price,
      selectedToppings: [], // Not applicable for chicken
      selectedModifiers: finalModifiers,
      specialInstructions,
      totalPrice: itemPrice,
      displayName: `${item.name} (${currentVariant.name})`,
    };

    console.log("✅ Chicken customization completed:", configuredItem);
    onComplete(configuredItem);
  }, [
    currentVariant,
    validate,
    selectedModifiers,
    selectedWhiteMeatTier,
    availableModifiers.whiteMeat,
    existingCartItem?.id,
    item.id,
    item.name,
    quantity,
    specialInstructions,
    itemPrice,
    onComplete,
  ]);

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading chicken options...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen || !currentVariant) return null;

  // ==========================================
  // RENDER COMPONENT
  // ==========================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
              <p className="text-lg text-green-600 font-semibold">
                ${totalPrice.toFixed(2)}{" "}
                {quantity > 1 && `(${quantity} × $${itemPrice.toFixed(2)})`}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Variant Selection */}
          {item.variants && item.variants.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Choose Size
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {item.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => handleVariantChange(variant.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      currentVariant?.id === variant.id
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold">{variant.name}</div>
                    <div className="text-sm text-gray-600">
                      {variant.serves}
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      ${variant.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* White Meat Selection */}
          {whiteMeatTiers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🍗 White Meat Options
              </h3>
              <div className="space-y-2">
                {whiteMeatTiers.map((tier) => (
                  <label key={tier.id} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="whiteMeatTier"
                      checked={selectedWhiteMeatTier?.id === tier.id}
                      onChange={() => handleWhiteMeatTierChange(tier)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{tier.name}</span>
                    {tier.multiplier > 0 && (
                      <span className="text-green-600 font-semibold">
                        +$
                        {(
                          availableModifiers.whiteMeat[0]?.price_adjustment *
                            tier.multiplier || 0
                        ).toFixed(2)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sides Selection */}
          {availableModifiers.sides.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🥔 Included Sides
              </h3>
              <div className="space-y-2">
                {availableModifiers.sides.map((modifier) => (
                  <label
                    key={modifier.id}
                    className="flex items-center space-x-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModifiers.some(
                        (m) => m.id === modifier.id
                      )}
                      onChange={() => handleModifierToggle(modifier)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{modifier.name}</span>
                    {modifier.price_adjustment > 0 && (
                      <span className="text-green-600 font-semibold">
                        +${modifier.price_adjustment.toFixed(2)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preparation Options */}
          {availableModifiers.preparation.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                👨‍🍳 Preparation
              </h3>
              <div className="space-y-2">
                {availableModifiers.preparation.map((modifier) => (
                  <label
                    key={modifier.id}
                    className="flex items-center space-x-3"
                  >
                    <input
                      type="radio"
                      name="preparation"
                      checked={selectedModifiers.some(
                        (m) => m.id === modifier.id
                      )}
                      onChange={() => handleModifierToggle(modifier)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{modifier.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Condiments */}
          {availableModifiers.condiments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🧄 Condiments
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {availableModifiers.condiments.map((modifier) => (
                  <label
                    key={modifier.id}
                    className="flex items-center space-x-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModifiers.some(
                        (m) => m.id === modifier.id
                      )}
                      onChange={() => handleModifierToggle(modifier)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{modifier.name}</span>
                    {modifier.price_adjustment > 0 && (
                      <span className="text-green-600 font-semibold">
                        +${modifier.price_adjustment.toFixed(2)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Quantity and Special Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
            >
              Add to Cart - ${totalPrice.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

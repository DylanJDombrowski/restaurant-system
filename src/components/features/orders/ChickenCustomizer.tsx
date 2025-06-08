// src/components/features/orders/ChickenCustomizer.tsx - FIXED API ENDPOINT
"use client";

import { ConfiguredCartItem, Customization, MenuItemVariant, MenuItemWithVariants } from "@/lib/types";
import { useChickenCustomization } from "@/lib/utils/chicken-customization";
import { useCallback, useEffect, useState } from "react";

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

  // ==========================================
  // DATA LOADING - FIXED API ENDPOINT
  // ==========================================

  const loadCustomizations = useCallback(async () => {
    try {
      setLoading(true);

      // FIXED: Use the correct customization endpoint
      const response = await fetch(`/api/menu/customization?restaurant_id=${restaurantId}&applies_to=chicken`);

      if (response.ok) {
        const data = await response.json();
        console.log("🐔 Loaded chicken customizations:", data.data?.length || 0);
        setAllCustomizations(data.data || []);
      } else {
        console.error("Failed to load customizations:", response.status);
        setAllCustomizations([]);
      }
    } catch (error) {
      console.error("Failed to load customizations:", error);
      setAllCustomizations([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (isOpen) {
      loadCustomizations();
    }
  }, [isOpen, loadCustomizations]);

  // ==========================================
  // ENHANCED CHICKEN CUSTOMIZATION HOOK
  // ==========================================

  const { availableCustomizations, whiteMeatTiers, defaultSelections, calculatePrice, validate } = useChickenCustomization(
    currentVariant || {
      id: "",
      menu_item_id: "",
      name: "",
      price: 0,
      size_code: "",
      sort_order: 0,
      is_available: true,
      prep_time_minutes: 0,
    },
    allCustomizations,
    restaurantId
  );

  // ==========================================
  // PRICE CALCULATION
  // ==========================================

  const updatePrice = useCallback(async () => {
    if (!currentVariant) return;

    try {
      setIsCalculatingPrice(true);
      const price = await calculatePrice(selectedWhiteMeatTier, selectedCustomizations);
      setCurrentPrice(price);
      console.log("🐔 Price calculated:", price);
    } catch (error) {
      console.error("Error calculating price:", error);
      setCurrentPrice(currentVariant.price);
    } finally {
      setIsCalculatingPrice(false);
    }
  }, [currentVariant, selectedWhiteMeatTier, selectedCustomizations, calculatePrice]);

  useEffect(() => {
    updatePrice();
  }, [updatePrice]);

  // ==========================================
  // INITIALIZATION EFFECTS
  // ==========================================

  useEffect(() => {
    // Set defaults when variant changes or customizations load
    if (currentVariant && defaultSelections.length > 0 && !existingCartItem) {
      console.log("🐔 Setting default selections for", currentVariant.name);
      setSelectedCustomizations(defaultSelections.map((d) => d.id));

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

      // Restore customizations
      const customizationIds = existingCartItem.selectedModifiers?.map((m) => m.id) || [];
      setSelectedCustomizations(customizationIds);

      // Try to determine white meat tier from existing data
      // This is simplified - you might want more complex logic
      const noneTier = whiteMeatTiers.find((t) => t.level === "none");
      if (noneTier) {
        setSelectedWhiteMeatTier(noneTier);
      }
    }
  }, [existingCartItem, currentVariant, whiteMeatTiers]);

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
        setSelectedCustomizations([]);
        setSelectedWhiteMeatTier(null);
      }
    },
    [item.variants]
  );

  const handleWhiteMeatTierChange = useCallback((tier: WhiteMeatTier) => {
    console.log("🍗 White meat tier changed to:", tier.name);
    setSelectedWhiteMeatTier(tier);
  }, []);

  const handleCustomizationToggle = useCallback((customizationId: string) => {
    setSelectedCustomizations((prev) => {
      if (prev.includes(customizationId)) {
        return prev.filter((id) => id !== customizationId);
      } else {
        return [...prev, customizationId];
      }
    });
  }, []);

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
      .filter(Boolean);

    const configuredItem: ConfiguredCartItem = {
      id: existingCartItem?.id || `${item.id}-${currentVariant.id}-${Date.now()}`,
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      quantity,
      basePrice: currentVariant.price,
      selectedToppings: [], // Not applicable for chicken
      selectedModifiers: configuredModifiers as { id: string; name: string; priceAdjustment: number }[],
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
    item.id,
    item.name,
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

  const totalPrice = currentPrice * quantity;

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
                {isCalculatingPrice ? "Calculating..." : `$${totalPrice.toFixed(2)}`}
                {quantity > 1 && !isCalculatingPrice && ` (${quantity} × $${currentPrice.toFixed(2)})`}
              </p>
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Variant Selection */}
          {item.variants && item.variants.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Size</h3>
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
                    <div className="text-sm text-gray-600">{variant.serves}</div>
                    <div className="text-lg font-bold text-green-600">${variant.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* White Meat Selection */}
          {whiteMeatTiers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🍗 White Meat Options</h3>
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
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sides Selection */}
          {availableCustomizations.sides.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🥔 Sides</h3>
              <div className="space-y-2">
                {availableCustomizations.sides.map((customization) => (
                  <label key={customization.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCustomizations.includes(customization.id)}
                      onChange={() => handleCustomizationToggle(customization.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{customization.name}</span>
                    {customization.base_price > 0 && (
                      <span className="text-green-600 font-semibold">+${customization.base_price.toFixed(2)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preparation Options */}
          {availableCustomizations.preparation.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">👨‍🍳 Preparation</h3>
              <div className="space-y-2">
                {availableCustomizations.preparation.map((customization) => (
                  <label key={customization.id} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="preparation"
                      checked={selectedCustomizations.includes(customization.id)}
                      onChange={() => handleCustomizationToggle(customization.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{customization.name}</span>
                    {customization.base_price > 0 && (
                      <span className="text-green-600 font-semibold">+${customization.base_price.toFixed(2)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Condiments */}
          {availableCustomizations.condiments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🧄 Condiments</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableCustomizations.condiments.map((customization) => (
                  <label key={customization.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCustomizations.includes(customization.id)}
                      onChange={() => handleCustomizationToggle(customization.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1">{customization.name}</span>
                    {customization.base_price > 0 && (
                      <span className="text-green-600 font-semibold">+${customization.base_price.toFixed(2)}</span>
                    )}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
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
            <button onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={isCalculatingPrice}
              className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400"
            >
              {isCalculatingPrice ? "Calculating..." : `Add to Cart - $${totalPrice.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

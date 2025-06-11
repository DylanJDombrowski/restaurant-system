// src/components/features/orders/AppetizerCustomizer.tsx - FIXED VERSION
"use client";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  ConfiguredCartItem,
  ConfiguredModifier,
  MenuItemVariant,
  MenuItemWithVariants,
  Modifier,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * 🍗 APPETIZER CUSTOMIZER COMPONENT
 *
 * Handles appetizer customization with condiments and preparation options.
 * Designed for admin dashboard compatibility with clean database structure.
 */

interface AppetizerCustomizerProps {
  item: MenuItemWithVariants;
  selectedVariant?: MenuItemVariant; // For sized items (wings, chicken, etc.)
  existingCartItem?: ConfiguredCartItem; // For editing from cart
  onComplete: (cartItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

interface CondimentOption {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

interface PreparationOption {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

export default function AppetizerCustomizer({
  item,
  selectedVariant,
  existingCartItem,
  onComplete,
  onCancel,
  isOpen,
  restaurantId,
}: AppetizerCustomizerProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [condiments, setCondiments] = useState<CondimentOption[]>([]);
  const [preparations, setPreparations] = useState<PreparationOption[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    existingCartItem?.specialInstructions || ""
  );
  const [loading, setLoading] = useState(true);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadModifiers = useCallback(async () => {
    try {
      setLoading(true);

      // Determine condiment category based on item type
      const isWings = item.name.toLowerCase().includes("wing");
      const condimentCategory = isWings
        ? "wing_condiment"
        : "appetizer_condiment";

      const response = await fetch(
        `/api/menu/modifiers?restaurant_id=${restaurantId}`
      );
      if (!response.ok) {
        throw new Error("Failed to load modifiers");
      }

      const data = await response.json();
      const modifiers: Modifier[] = data.data || []; // 🔧 FIX: Proper typing instead of any

      // Separate condiments and preparations with proper typing
      const condimentModifiers = modifiers.filter(
        (mod: Modifier) => mod.category === condimentCategory
      );
      const preparationModifiers = modifiers.filter(
        (mod: Modifier) => mod.category === "appetizer_preparation"
      );

      // Initialize condiments with existing selections
      const condimentOptions: CondimentOption[] = condimentModifiers.map(
        (mod: Modifier) => ({
          id: mod.id,
          name: mod.name,
          price: mod.price_adjustment || 0,
          selected:
            existingCartItem?.selectedModifiers?.some((m) => m.id === mod.id) ||
            false,
        })
      );

      // Initialize preparations with existing selections
      const preparationOptions: PreparationOption[] = preparationModifiers.map(
        (mod: Modifier) => ({
          id: mod.id,
          name: mod.name,
          price: mod.price_adjustment || 0,
          selected:
            existingCartItem?.selectedModifiers?.some((m) => m.id === mod.id) ||
            false,
        })
      );

      setCondiments(condimentOptions);
      setPreparations(preparationOptions);
    } catch (error) {
      console.error("Error loading appetizer modifiers:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, item.name, existingCartItem]);

  useEffect(() => {
    if (isOpen) {
      loadModifiers();
    }
  }, [isOpen, loadModifiers]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleCondimentToggle = useCallback((condimentId: string) => {
    setCondiments((prev) =>
      prev.map((condiment) =>
        condiment.id === condimentId
          ? { ...condiment, selected: !condiment.selected }
          : condiment
      )
    );
  }, []);

  const handlePreparationToggle = useCallback((preparationId: string) => {
    setPreparations((prev) =>
      prev.map((prep) =>
        prep.id === preparationId ? { ...prep, selected: !prep.selected } : prep
      )
    );
  }, []);

  const handleSpecialInstructionsChange = useCallback(
    (instructions: string) => {
      setSpecialInstructions(instructions);
    },
    []
  );

  // ==========================================
  // PRICE CALCULATION
  // ==========================================

  const calculatedPrice = useMemo(() => {
    const basePrice = selectedVariant?.price || item.base_price;

    const condimentCost = condiments
      .filter((c) => c.selected)
      .reduce((total, c) => total + c.price, 0);

    const preparationCost = preparations
      .filter((p) => p.selected)
      .reduce((total, p) => total + p.price, 0);

    return basePrice + condimentCost + preparationCost;
  }, [selectedVariant, item.base_price, condiments, preparations]);

  // ==========================================
  // COMPLETION HANDLER
  // ==========================================

  const handleComplete = useCallback(() => {
    const selectedModifiers: ConfiguredModifier[] = [];

    // Add selected condiments
    condiments
      .filter((c) => c.selected)
      .forEach((condiment) => {
        selectedModifiers.push({
          id: condiment.id,
          name: condiment.name,
          priceAdjustment: condiment.price,
        });
      });

    // Add selected preparations
    preparations
      .filter((p) => p.selected)
      .forEach((preparation) => {
        selectedModifiers.push({
          id: preparation.id,
          name: preparation.name,
          priceAdjustment: preparation.price,
        });
      });

    // Create cart item
    const cartItem: ConfiguredCartItem = {
      id:
        existingCartItem?.id ||
        `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: selectedVariant?.id || null,
      variantName: selectedVariant?.name || null,
      quantity: existingCartItem?.quantity || 1,
      basePrice: selectedVariant?.price || item.base_price,
      selectedToppings: [], // Appetizers don't use toppings
      selectedModifiers,
      specialInstructions,
      totalPrice: calculatedPrice,
      displayName: selectedVariant?.name
        ? `${selectedVariant.name} ${item.name}`
        : item.name,
    };

    console.log("🍗 Completed appetizer customization:", cartItem);
    onComplete(cartItem);
  }, [
    condiments,
    preparations,
    specialInstructions,
    calculatedPrice,
    item,
    selectedVariant,
    existingCartItem,
    onComplete,
  ]);

  // ==========================================
  // RENDER
  // ==========================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize {selectedVariant?.name || item.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Base price: $
              {(selectedVariant?.price || item.base_price).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ${calculatedPrice.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Current total</div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <LoadingScreen />
          ) : (
            <div className="p-6 space-y-6">
              {/* Condiments Section */}
              {condiments.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🧄</span>
                    Condiments
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {condiments.map((condiment) => (
                      <CondimentOption
                        key={condiment.id}
                        condiment={condiment}
                        onToggle={() => handleCondimentToggle(condiment.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Preparations Section */}
              {preparations.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🔥</span>
                    Preparation
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {preparations.map((preparation) => (
                      <PreparationOption
                        key={preparation.id}
                        preparation={preparation}
                        onToggle={() => handlePreparationToggle(preparation.id)}
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
                  placeholder="Any special requests for this item..."
                  value={specialInstructions}
                  onChange={(e) =>
                    handleSpecialInstructionsChange(e.target.value)
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
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
              onClick={handleComplete}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {existingCartItem ? "Update Cart" : "Add to Cart"}
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

interface CondimentOptionProps {
  condiment: CondimentOption;
  onToggle: () => void;
}

function CondimentOption({ condiment, onToggle }: CondimentOptionProps) {
  return (
    <label
      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
        condiment.selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={condiment.selected}
          onChange={onToggle}
          className="mr-3 text-blue-600 focus:ring-blue-500"
        />
        <span className="font-medium text-gray-900">{condiment.name}</span>
      </div>
      {condiment.price > 0 && (
        <span className="text-sm font-semibold text-green-600">
          +${condiment.price.toFixed(2)}
        </span>
      )}
    </label>
  );
}

interface PreparationOptionProps {
  preparation: PreparationOption;
  onToggle: () => void;
}

function PreparationOption({ preparation, onToggle }: PreparationOptionProps) {
  return (
    <label
      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
        preparation.selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={preparation.selected}
          onChange={onToggle}
          className="mr-3 text-blue-600 focus:ring-blue-500"
        />
        <span className="font-medium text-gray-900">{preparation.name}</span>
      </div>
      {preparation.price > 0 && (
        <span className="text-sm font-semibold text-green-600">
          +${preparation.price.toFixed(2)}
        </span>
      )}
    </label>
  );
}

// src/components/features/orders/ChickenCustomizer.tsx
"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ConfiguredCartItem,
  MenuItemWithVariants,
  MenuItemVariant,
  ConfiguredModifier,
  Modifier,
} from "@/lib/types";

/**
 * 🍗 CHICKEN CUSTOMIZER COMPONENT
 *
 * Database-driven customizer for Pizza Mia chicken orders.
 * Handles family packs, individual pieces, and bulk orders with proper business logic.
 */

interface ChickenCustomizerProps {
  item: MenuItemWithVariants;
  selectedVariant?: MenuItemVariant;
  existingCartItem?: ConfiguredCartItem;
  onComplete: (cartItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

interface ChickenConfiguration {
  whiteMeatLevel: "none" | "white" | "extra" | "xxtra";
  sides: string[]; // Array of selected side modifier IDs
  crispy: boolean;
  condiments: string[]; // Array of selected condiment modifier IDs
  specialInstructions: string;
}

// ==========================================
// CHICKEN TYPE DETECTION
// ==========================================

interface ChickenTypeInfo {
  type: "family_pack" | "regular_piece" | "individual" | "bulk";
  pieceCount: number;
  isFamily: boolean;
  allowsWhiteMeat: boolean;
  includesSides: boolean;
  allowsCondiments: boolean;
}

function analyzeChickenType(item: MenuItemWithVariants): ChickenTypeInfo {
  const name = item.name.toLowerCase();

  // Individual pieces
  if (
    name.includes("breast") ||
    name.includes("thigh") ||
    name.includes("leg") ||
    name.includes("wing")
  ) {
    return {
      type: "individual",
      pieceCount: 1,
      isFamily: false,
      allowsWhiteMeat: false, // Individual pieces are what they are
      includesSides: false,
      allowsCondiments: true,
    };
  }

  // Bulk orders (25+ pieces)
  if (name.includes("bulk") || item.base_price > 40) {
    return {
      type: "bulk",
      pieceCount: 25, // Estimate
      isFamily: false,
      allowsWhiteMeat: false, // Bulk orders are mixed
      includesSides: false,
      allowsCondiments: false,
    };
  }

  // Family packs (includes sides)
  if (name.includes("family")) {
    const pieceCount = extractPieceCount(name);
    return {
      type: "family_pack",
      pieceCount,
      isFamily: true,
      allowsWhiteMeat: true,
      includesSides: true,
      allowsCondiments: true,
    };
  }

  // Regular chicken pieces (no sides)
  const pieceCount = extractPieceCount(name);
  return {
    type: "regular_piece",
    pieceCount,
    isFamily: false,
    allowsWhiteMeat: true,
    includesSides: pieceCount === 8, // Only 8 PC includes broasted potatoes
    allowsCondiments: true,
  };
}

function extractPieceCount(name: string): number {
  const matches = name.match(/(\d+)\s*pc/i);
  return matches ? parseInt(matches[1]) : 8; // Default to 8
}

// ==========================================
// MAIN COMPONENT
// ==========================================

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

  const [configuration, setConfiguration] = useState<ChickenConfiguration>(
    () => {
      return {
        whiteMeatLevel: "none",
        sides: [],
        crispy: false,
        condiments: [],
        specialInstructions: existingCartItem?.specialInstructions || "",
      };
    }
  );

  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);

  // Analyze chicken type
  const chickenInfo = useMemo(() => analyzeChickenType(item), [item]);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadModifiers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/menu/modifiers?restaurant_id=${restaurantId}`
      );
      if (!response.ok) throw new Error("Failed to load modifiers");

      const data = await response.json();
      setModifiers(data.data || []);

      // Parse existing cart item if editing
      if (existingCartItem?.selectedModifiers) {
        parseExistingConfiguration(existingCartItem.selectedModifiers);
      }
    } catch (error) {
      console.error("Error loading chicken modifiers:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, existingCartItem]);

  useEffect(() => {
    if (isOpen) {
      loadModifiers();
    }
  }, [isOpen, loadModifiers]);

  // ==========================================
  // MODIFIER FILTERING
  // ==========================================

  const whiteMeatModifiers = useMemo(() => {
    if (!chickenInfo.allowsWhiteMeat) return [];

    const categoryKey = `chicken_white_meat_${chickenInfo.pieceCount}pc${
      chickenInfo.isFamily ? "_family" : ""
    }`;
    return modifiers.filter((m) => m.category === categoryKey);
  }, [modifiers, chickenInfo]);

  const sidesModifiers = useMemo(() => {
    if (!chickenInfo.includesSides) return [];

    const categoryKey = chickenInfo.isFamily
      ? "chicken_family_sides"
      : "chicken_8pc_sides";
    return modifiers.filter((m) => m.category === categoryKey);
  }, [modifiers, chickenInfo]);

  const preparationModifiers = useMemo(() => {
    return modifiers.filter((m) => m.category === "chicken_preparation");
  }, [modifiers]);

  const condimentModifiers = useMemo(() => {
    if (!chickenInfo.allowsCondiments) return [];
    return modifiers.filter((m) => m.category === "chicken_condiment");
  }, [modifiers, chickenInfo]);

  // ==========================================
  // PARSING EXISTING CONFIGURATION
  // ==========================================

  const parseExistingConfiguration = useCallback(
    (existingModifiers: ConfiguredModifier[]) => {
      const newConfig: ChickenConfiguration = {
        whiteMeatLevel: "none",
        sides: [],
        crispy: false,
        condiments: [],
        specialInstructions: existingCartItem?.specialInstructions || "",
      };

      existingModifiers.forEach((modifier) => {
        // Parse white meat level
        if (modifier.name.includes("White Meat")) {
          if (modifier.name.includes("XXtra")) {
            newConfig.whiteMeatLevel = "xxtra";
          } else if (modifier.name.includes("Extra")) {
            newConfig.whiteMeatLevel = "extra";
          } else {
            newConfig.whiteMeatLevel = "white";
          }
        }

        // Parse crispy
        if (modifier.name.includes("Extra Crispy")) {
          newConfig.crispy = true;
        }

        // Parse sides and condiments
        const matchingModifier = modifiers.find((m) => m.id === modifier.id);
        if (matchingModifier) {
          if (matchingModifier.category.includes("sides")) {
            newConfig.sides.push(modifier.id);
          } else if (matchingModifier.category === "chicken_condiment") {
            newConfig.condiments.push(modifier.id);
          }
        }
      });

      setConfiguration(newConfig);
    },
    [modifiers, existingCartItem]
  );

  // ==========================================
  // PRICE CALCULATION
  // ==========================================

  const calculatedPrice = useMemo(() => {
    const basePrice = selectedVariant?.price || item.base_price;

    // Add white meat cost
    let whiteMeatCost = 0;
    if (configuration.whiteMeatLevel !== "none") {
      const whiteMeatModifier = whiteMeatModifiers.find((m) =>
        m.name.toLowerCase().includes(configuration.whiteMeatLevel)
      );
      if (whiteMeatModifier) {
        whiteMeatCost = whiteMeatModifier.price_adjustment;
      }
    }

    // Add condiment costs
    const condimentCost = configuration.condiments.reduce(
      (total, condimentId) => {
        const condiment = condimentModifiers.find((m) => m.id === condimentId);
        return total + (condiment?.price_adjustment || 0);
      },
      0
    );

    // Sides are included (price_adjustment = 0)

    return basePrice + whiteMeatCost + condimentCost;
  }, [
    selectedVariant,
    item.base_price,
    configuration,
    whiteMeatModifiers,
    condimentModifiers,
  ]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleWhiteMeatChange = useCallback(
    (level: ChickenConfiguration["whiteMeatLevel"]) => {
      setConfiguration((prev) => ({ ...prev, whiteMeatLevel: level }));
    },
    []
  );

  const handleSideToggle = useCallback((sideId: string) => {
    setConfiguration((prev) => ({
      ...prev,
      sides: prev.sides.includes(sideId)
        ? prev.sides.filter((id) => id !== sideId)
        : [...prev.sides, sideId],
    }));
  }, []);

  const handleCrispyToggle = useCallback(() => {
    setConfiguration((prev) => ({ ...prev, crispy: !prev.crispy }));
  }, []);

  const handleCondimentToggle = useCallback((condimentId: string) => {
    setConfiguration((prev) => ({
      ...prev,
      condiments: prev.condiments.includes(condimentId)
        ? prev.condiments.filter((id) => id !== condimentId)
        : [...prev.condiments, condimentId],
    }));
  }, []);

  // ==========================================
  // COMPLETION HANDLER
  // ==========================================

  const handleComplete = useCallback(() => {
    const selectedModifiers: ConfiguredModifier[] = [];

    // Add white meat modifier
    if (configuration.whiteMeatLevel !== "none") {
      const whiteMeatModifier = whiteMeatModifiers.find((m) =>
        m.name.toLowerCase().includes(configuration.whiteMeatLevel)
      );
      if (whiteMeatModifier) {
        selectedModifiers.push({
          id: whiteMeatModifier.id,
          name: whiteMeatModifier.name,
          priceAdjustment: whiteMeatModifier.price_adjustment,
        });
      }
    }

    // Add selected sides
    configuration.sides.forEach((sideId) => {
      const sideModifier = sidesModifiers.find((m) => m.id === sideId);
      if (sideModifier) {
        selectedModifiers.push({
          id: sideModifier.id,
          name: sideModifier.name,
          priceAdjustment: sideModifier.price_adjustment,
        });
      }
    });

    // Add crispy if selected
    if (configuration.crispy) {
      const crispyModifier = preparationModifiers.find((m) =>
        m.name.includes("Extra Crispy")
      );
      if (crispyModifier) {
        selectedModifiers.push({
          id: crispyModifier.id,
          name: crispyModifier.name,
          priceAdjustment: crispyModifier.price_adjustment,
        });
      }
    }

    // Add selected condiments
    configuration.condiments.forEach((condimentId) => {
      const condiment = condimentModifiers.find((m) => m.id === condimentId);
      if (condiment) {
        selectedModifiers.push({
          id: condiment.id,
          name: condiment.name,
          priceAdjustment: condiment.price_adjustment,
        });
      }
    });

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
      selectedToppings: [],
      selectedModifiers,
      specialInstructions: configuration.specialInstructions,
      totalPrice: calculatedPrice,
      displayName: selectedVariant?.name
        ? `${selectedVariant.name} ${item.name}`
        : item.name,
    };

    console.log("🍗 Completed chicken customization:", cartItem);
    onComplete(cartItem);
  }, [
    configuration,
    whiteMeatModifiers,
    sidesModifiers,
    preparationModifiers,
    condimentModifiers,
    selectedVariant,
    item,
    calculatedPrice,
    existingCartItem,
    onComplete,
  ]);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderWhiteMeatSection = () => {
    if (!chickenInfo.allowsWhiteMeat || whiteMeatModifiers.length === 0)
      return null;

    return (
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          White Meat Options
          <span className="text-sm font-normal text-gray-600 ml-2">
            (Additional charges apply)
          </span>
        </h3>
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="radio"
                name="whiteMeat"
                value="none"
                checked={configuration.whiteMeatLevel === "none"}
                onChange={() => handleWhiteMeatChange("none")}
                className="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-900">Regular Mix</span>
            </div>
            <span className="text-gray-500">No charge</span>
          </label>

          {whiteMeatModifiers.map((modifier) => {
            const level = modifier.name.includes("XXtra")
              ? "xxtra"
              : modifier.name.includes("Extra")
              ? "extra"
              : "white";

            return (
              <label
                key={modifier.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="whiteMeat"
                    value={level}
                    checked={configuration.whiteMeatLevel === level}
                    onChange={() => handleWhiteMeatChange(level)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">{modifier.name}</span>
                </div>
                <span className="text-green-600 font-medium">
                  +${modifier.price_adjustment.toFixed(2)}
                </span>
              </label>
            );
          })}
        </div>
      </section>
    );
  };

  const renderSidesSection = () => {
    if (!chickenInfo.includesSides || sidesModifiers.length === 0) return null;

    return (
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Included Sides
          <span className="text-sm font-normal text-gray-600 ml-2">
            (No additional charge)
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {sidesModifiers.map((side) => (
            <label key={side.id} className="flex items-center">
              <input
                type="checkbox"
                checked={configuration.sides.includes(side.id)}
                onChange={() => handleSideToggle(side.id)}
                className="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-900">{side.name}</span>
            </label>
          ))}
        </div>
      </section>
    );
  };

  const renderCondimentsSection = () => {
    if (!chickenInfo.allowsCondiments || condimentModifiers.length === 0)
      return null;

    return (
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Condiments & Sauces
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {condimentModifiers.map((condiment) => (
            <label
              key={condiment.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={configuration.condiments.includes(condiment.id)}
                  onChange={() => handleCondimentToggle(condiment.id)}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900">{condiment.name}</span>
              </div>
              {condiment.price_adjustment > 0 && (
                <span className="text-green-600 font-medium text-sm">
                  +${condiment.price_adjustment.toFixed(2)}
                </span>
              )}
            </label>
          ))}
        </div>
      </section>
    );
  };

  // ==========================================
  // MAIN RENDER
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
              {chickenInfo.pieceCount} piece{" "}
              {chickenInfo.isFamily ? "family pack" : "chicken"}
              {chickenInfo.type === "bulk" && " (bulk order)"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ${calculatedPrice.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Current total</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="text-lg text-gray-600">
                Loading customization options...
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {renderWhiteMeatSection()}
              {renderSidesSection()}

              {/* Preparation Options */}
              {chickenInfo.type !== "bulk" && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Preparation
                  </h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={configuration.crispy}
                      onChange={handleCrispyToggle}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-900">Extra Crispy</span>
                  </label>
                </section>
              )}

              {renderCondimentsSection()}

              {/* Special Instructions */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Special Instructions
                </h3>
                <textarea
                  placeholder="Any special requests for this chicken order..."
                  value={configuration.specialInstructions}
                  onChange={(e) =>
                    setConfiguration((prev) => ({
                      ...prev,
                      specialInstructions: e.target.value,
                    }))
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

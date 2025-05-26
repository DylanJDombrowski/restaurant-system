// src/components/features/orders/ChickenCustomizer.tsx - SIMPLE WORKING VERSION
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
 * 🍗 SIMPLE CHICKEN CUSTOMIZER
 *
 * FIXES APPLIED:
 * ✅ Bulk chicken: only preparation options
 * ✅ Individual pieces: handled by MenuNavigator (direct to cart)
 * ✅ Family packs: garlic bread + coleslaw default (NO broasted potatoes)
 * ✅ White meat pricing scales with piece count
 * ✅ Works with your existing modifier system
 */

interface ChickenCustomizerProps {
  item: MenuItemWithVariants;
  existingCartItem?: ConfiguredCartItem;
  onComplete: (cartItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

interface ChickenConfiguration {
  selectedVariantId: string | null;
  selectedModifiers: string[];
  specialInstructions: string;
}

// ==========================================
// SIMPLE BUSINESS LOGIC HELPERS
// ==========================================

function isChickenType(
  item: MenuItemWithVariants,
  variant: MenuItemVariant | null,
  type: string
): boolean {
  const itemName = item.name.toLowerCase();
  const variantName = variant?.name.toLowerCase() || "";

  switch (type) {
    case "bulk":
      return (
        itemName.includes("bulk") || (variant?.price || item.base_price) > 40
      );
    case "family":
      return itemName.includes("family") || variantName.includes("family");
    case "individual":
      return (
        itemName.includes("breast") ||
        itemName.includes("thigh") ||
        itemName.includes("leg") ||
        itemName.includes("wing")
      );
    default:
      return false;
  }
}

function getChickenCapabilities(
  item: MenuItemWithVariants,
  variant: MenuItemVariant | null
) {
  if (isChickenType(item, variant, "bulk")) {
    return {
      allowsWhiteMeat: false,
      allowsSides: false,
      allowsCondiments: false,
      allowsPreparation: true,
      defaultSides: [],
      message: "Bulk orders come as mixed chicken with limited customization",
    };
  }

  if (isChickenType(item, variant, "family")) {
    return {
      allowsWhiteMeat: true,
      allowsSides: true,
      allowsCondiments: true,
      allowsPreparation: true,
      defaultSides: ["garlic_bread", "coleslaw"], // NO broasted potatoes
      message: null,
    };
  }

  // Regular chicken (8 PC, 12 PC, etc.)
  return {
    allowsWhiteMeat: true,
    allowsSides: true,
    allowsCondiments: true,
    allowsPreparation: true,
    defaultSides: variant?.name.includes("8") ? ["broasted_potatoes"] : [],
    message: null,
  };
}

function getPieceCount(variant: MenuItemVariant | null): number {
  if (!variant) return 8;
  const match = variant.name.match(/(\d+)\s*pc/i);
  return match ? parseInt(match[1]) : 8;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ChickenCustomizer({
  item,
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
      const initialVariantId =
        existingCartItem?.variantId ||
        (item.variants && item.variants.length > 0
          ? item.variants[0].id
          : null);

      return {
        selectedVariantId: initialVariantId,
        selectedModifiers: [],
        specialInstructions: existingCartItem?.specialInstructions || "",
      };
    }
  );

  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);

  // Get selected variant
  const selectedVariant = useMemo(() => {
    if (!configuration.selectedVariantId || !item.variants) return null;
    return (
      item.variants.find((v) => v.id === configuration.selectedVariantId) ||
      null
    );
  }, [configuration.selectedVariantId, item.variants]);

  // Get capabilities for current selection
  const capabilities = useMemo(
    () => getChickenCapabilities(item, selectedVariant),
    [item, selectedVariant]
  );

  // ==========================================
  // DATA LOADING
  // ==========================================

  const setDefaultModifiers = useCallback(
    (availableModifiers: Modifier[]) => {
      // Only set defaults for family packs
      if (!isChickenType(item, selectedVariant, "family")) return;

      const defaultModifierIds = availableModifiers
        .filter((m) => {
          const category = m.category.toLowerCase();
          const name = m.name.toLowerCase();

          // For family packs - auto-select garlic bread and coleslaw
          return (
            category === "chicken_family_sides" &&
            (name.includes("garlic bread") || name.includes("coleslaw"))
          );
        })
        .map((m) => m.id);

      console.log("🔧 Setting default family sides:", defaultModifierIds);

      if (defaultModifierIds.length > 0) {
        setConfiguration((prev) => ({
          ...prev,
          selectedModifiers: defaultModifierIds,
        }));
      }
    },
    [item, selectedVariant]
  );

  const loadModifiers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/menu/modifiers?restaurant_id=${restaurantId}`
      );
      if (!response.ok) throw new Error("Failed to load modifiers");

      const data = await response.json();
      setModifiers(data.data || []);

      // Parse existing or set defaults
      if (existingCartItem?.selectedModifiers) {
        const existingIds = existingCartItem.selectedModifiers.map((m) => m.id);
        setConfiguration((prev) => ({
          ...prev,
          selectedModifiers: existingIds,
        }));
      } else {
        console.log(
          "🔧 Setting initial defaults for:",
          item.name,
          selectedVariant?.name
        );
        setDefaultModifiers(data.data || []);
      }
    } catch (error) {
      console.error("Error loading chicken modifiers:", error);
    } finally {
      setLoading(false);
    }
  }, [
    restaurantId,
    existingCartItem,
    item.name,
    selectedVariant?.name,
    setDefaultModifiers,
  ]);

  useEffect(() => {
    if (isOpen) {
      loadModifiers();
    }
  }, [isOpen, loadModifiers]);

  // ==========================================
  // MODIFIER FILTERING
  // ==========================================

  const availableModifiers = useMemo(() => {
    const filtered = modifiers.filter((modifier) => {
      const category = modifier.category.toLowerCase();

      // For bulk chicken - ONLY chicken_preparation (Extra Crispy, Regular Cooking)
      if (isChickenType(item, selectedVariant, "bulk")) {
        return category === "chicken_preparation";
      }

      // For family packs - only specific family categories
      if (isChickenType(item, selectedVariant, "family")) {
        const pieceCount = getPieceCount(selectedVariant);
        const isAllowed =
          category === `chicken_white_meat_${pieceCount}pc_family` ||
          category === "chicken_family_sides" ||
          category === "chicken_preparation" ||
          category === "chicken_condiment";

        if (isAllowed) {
          console.log(
            "🔧 Family pack allowing:",
            modifier.name,
            "(",
            category,
            ")"
          );
        }
        return isAllowed;
      }

      // For regular chicken - only specific regular categories
      const pieceCount = getPieceCount(selectedVariant);
      return (
        category === `chicken_white_meat_${pieceCount}pc` ||
        category === "chicken_8pc_sides" ||
        category === "chicken_preparation" ||
        category === "chicken_condiment"
      );
    });

    console.log(
      "🔧 Available modifiers for",
      item.name,
      selectedVariant?.name,
      ":",
      filtered.length
    );
    return filtered;
  }, [modifiers, item, selectedVariant]);

  const modifiersByCategory = useMemo(() => {
    const categories = new Map<string, Modifier[]>();

    availableModifiers.forEach((modifier) => {
      if (!categories.has(modifier.category)) {
        categories.set(modifier.category, []);
      }
      categories.get(modifier.category)!.push(modifier);
    });

    return categories;
  }, [availableModifiers]);

  // ==========================================
  // PRICE CALCULATION
  // ==========================================

  const calculatedPrice = useMemo(() => {
    const basePrice = selectedVariant?.price || item.base_price;

    const modifierCost = configuration.selectedModifiers.reduce(
      (total, modifierId) => {
        const modifier = modifiers.find((m) => m.id === modifierId);
        if (!modifier) return total;

        const price = modifier.price_adjustment;
        return total + price;
      },
      0
    );

    return basePrice + modifierCost;
  }, [
    selectedVariant,
    item.base_price,
    configuration.selectedModifiers,
    modifiers,
  ]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleVariantSelect = useCallback(
    (variantId: string) => {
      setConfiguration((prev) => ({
        ...prev,
        selectedVariantId: variantId,
        selectedModifiers: [], // Reset modifiers when variant changes
      }));

      // Set defaults for the new variant after a brief delay
      setTimeout(() => {
        const newVariant = item.variants?.find((v) => v.id === variantId);
        if (newVariant && isChickenType(item, newVariant, "family")) {
          console.log("🔧 Variant changed to family pack, setting defaults");
          setDefaultModifiers(modifiers);
        }
      }, 100);
    },
    [modifiers, item, setDefaultModifiers]
  );

  const handleModifierToggle = useCallback((modifierId: string) => {
    setConfiguration((prev) => ({
      ...prev,
      selectedModifiers: prev.selectedModifiers.includes(modifierId)
        ? prev.selectedModifiers.filter((id) => id !== modifierId)
        : [...prev.selectedModifiers, modifierId],
    }));
  }, []);

  // ==========================================
  // COMPLETION HANDLER
  // ==========================================

  const handleComplete = useCallback(() => {
    if (!configuration.selectedVariantId) {
      alert("Please select a size/variant first.");
      return;
    }

    const selectedModifierObjects: ConfiguredModifier[] =
      configuration.selectedModifiers.map((modifierId) => {
        const modifier = modifiers.find((m) => m.id === modifierId);
        if (!modifier) throw new Error(`Modifier ${modifierId} not found`);

        const price = modifier.price_adjustment;

        return {
          id: modifier.id,
          name: modifier.name,
          priceAdjustment: price,
        };
      });

    const cartItem: ConfiguredCartItem = {
      id:
        existingCartItem?.id ||
        `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: configuration.selectedVariantId,
      variantName: selectedVariant?.name || null,
      quantity: existingCartItem?.quantity || 1,
      basePrice: selectedVariant?.price || item.base_price,
      selectedToppings: [],
      selectedModifiers: selectedModifierObjects,
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
    modifiers,
    selectedVariant,
    item,
    calculatedPrice,
    existingCartItem,
    onComplete,
  ]);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderVariantSelection = () => {
    if (!item.variants || item.variants.length <= 1) return null;

    return (
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Select Size/Type
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {item.variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => handleVariantSelect(variant.id)}
              className={`p-3 border-2 rounded-lg text-left transition-all ${
                configuration.selectedVariantId === variant.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">{variant.name}</div>
              <div className="text-lg font-bold text-green-600">
                ${variant.price.toFixed(2)}
              </div>
              {variant.serves && (
                <div className="text-xs text-gray-500">{variant.serves}</div>
              )}
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderModifierCategory = (
    category: string,
    categoryModifiers: Modifier[]
  ) => {
    const categoryDisplayNames: Record<string, string> = {
      chicken_white_meat: "White Meat Options",
      chicken_family_sides: "Family Pack Sides",
      chicken_8pc_sides: "Included Sides",
      chicken_preparation: "Preparation",
      chicken_condiment: "Condiments & Sauces",
    };

    // Get base category name (remove piece count specifics)
    let baseCategoryName = category;
    if (category.includes("chicken_white_meat")) {
      baseCategoryName = "chicken_white_meat";
    }

    const displayName = categoryDisplayNames[baseCategoryName] || category;
    const showPricing =
      category.includes("white_meat") || category.includes("condiment");

    return (
      <section key={category}>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {displayName}
          {!showPricing && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              (No additional charge)
            </span>
          )}
        </h3>

        <div className="space-y-2">
          {categoryModifiers.map((modifier) => {
            const isSelected = configuration.selectedModifiers.includes(
              modifier.id
            );

            const displayPrice = modifier.price_adjustment;
            // Price scaling is already handled in your database, so no need to scale here

            return (
              <label
                key={modifier.id}
                className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleModifierToggle(modifier.id)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">{modifier.name}</span>
                </div>
                {displayPrice > 0 && (
                  <span className="text-green-600 font-medium">
                    +${displayPrice.toFixed(2)}
                  </span>
                )}
              </label>
            );
          })}
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
              Customize {item.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedVariant ? (
                <>
                  {selectedVariant.name}
                  {capabilities.message && (
                    <span className="text-orange-600 ml-2">
                      • {capabilities.message}
                    </span>
                  )}
                </>
              ) : (
                "Select a size/type to continue"
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
              {renderVariantSelection()}

              {selectedVariant && (
                <>
                  {/* Show message for limited customization */}
                  {capabilities.message && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="text-orange-800 font-medium">
                        Limited Customization
                      </div>
                      <div className="text-orange-700 text-sm mt-1">
                        {capabilities.message}
                      </div>
                    </div>
                  )}

                  {/* Render modifier categories */}
                  {Array.from(modifiersByCategory.entries()).map(
                    ([category, categoryModifiers]) =>
                      renderModifierCategory(category, categoryModifiers)
                  )}

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
                </>
              )}
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
              disabled={loading || !configuration.selectedVariantId}
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

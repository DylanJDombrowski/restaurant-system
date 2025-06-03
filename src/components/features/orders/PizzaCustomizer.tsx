// src/components/features/orders/PizzaCustomizer.tsx
"use client";
import type {
  ConfiguredCartItem,
  ToppingAmount,
  CrustPricing,
  PizzaMenuResponse,
  PizzaPriceCalculationResponse,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * 🍕 ENHANCED PIZZA CUSTOMIZER
 *
 * Features:
 * ✅ Database-driven crust selection with real-time pricing
 * ✅ Size-first workflow: Choose size → Choose crust → Customize toppings
 * ✅ API-driven price calculations using database functions
 * ✅ Professional UI with clear pricing feedback
 * ✅ Specialty pizza template support (future)
 * ✅ Mobile-responsive design
 * ✅ Real-time price updates with debouncing
 */

// ===================================================================
// COMPONENT INTERFACES
// ===================================================================

interface ToppingConfiguration {
  id: string;
  name: string;
  category: string;
  amount: ToppingAmount;
  calculatedPrice: number;
  basePrice: number;
  isPremium: boolean;
  tier: "normal" | "premium" | "beef";
}

interface ModifierConfiguration {
  id: string;
  name: string;
  priceAdjustment: number;
  selected: boolean;
}

interface CrustSelection {
  sizeCode: string;
  crustType: string;
  basePrice: number;
  upcharge: number;
  displayName: string;
  isSpecial: boolean;
}

interface PizzaCustomizerProps {
  item: ConfiguredCartItem;
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function PizzaCustomizer({
  item,
  onComplete,
  onCancel,
  isOpen,
  restaurantId,
}: PizzaCustomizerProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  // Loading and data states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pizzaMenuData, setPizzaMenuData] = useState<PizzaMenuResponse | null>(
    null
  );

  // Selection states
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedCrust, setSelectedCrust] = useState<CrustSelection | null>(
    null
  );
  const [toppings, setToppings] = useState<ToppingConfiguration[]>([]);
  const [modifiers, setModifiers] = useState<ModifierConfiguration[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    item.specialInstructions || ""
  );

  // Pricing states
  const [currentPricing, setCurrentPricing] =
    useState<PizzaPriceCalculationResponse | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // UI states
  const [, setCurrentStep] = useState<"size" | "crust" | "toppings" | "review">(
    "size"
  );

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadPizzaMenuData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🍕 Loading pizza menu data...");

      const response = await fetch(
        `/api/menu/pizza?restaurant_id=${restaurantId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to load pizza menu: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      console.log("✅ Pizza menu data loaded:", result.data);
      setPizzaMenuData(result.data);

      // Initialize selections from existing cart item
      initializeFromCartItem(result.data);
    } catch (error) {
      console.error("Error loading pizza menu:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load pizza menu"
      );
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const initializeFromCartItem = useCallback(
    (menuData: PizzaMenuResponse) => {
      console.log("🔄 Initializing from cart item:", item);

      // Initialize size and crust from existing variant
      if (item.variantId && menuData.pizza_items.length > 0) {
        const pizzaItem = menuData.pizza_items.find((pi) =>
          pi.variants.some((v) => v.id === item.variantId)
        );

        if (pizzaItem) {
          const variant = pizzaItem.variants.find(
            (v) => v.id === item.variantId
          );
          if (variant) {
            setSelectedSize(variant.size_code);

            const crustData = menuData.crust_pricing.find(
              (cp) =>
                cp.size_code === variant.size_code &&
                cp.crust_type === variant.crust_type
            );

            if (crustData) {
              setSelectedCrust({
                sizeCode: crustData.size_code,
                crustType: crustData.crust_type,
                basePrice: crustData.base_price,
                upcharge: crustData.upcharge,
                displayName: getCrustDisplayName(
                  crustData.crust_type,
                  crustData.size_code
                ),
                isSpecial:
                  crustData.crust_type === "stuffed" ||
                  crustData.crust_type === "gluten_free",
              });
              setCurrentStep("toppings");
            }
          }
        }
      } else {
        // Default to medium if available
        const defaultSize = menuData.available_sizes.includes("12in")
          ? "12in"
          : menuData.available_sizes.includes("medium")
          ? "medium"
          : menuData.available_sizes[0];
        setSelectedSize(defaultSize);
      }

      // Initialize toppings
      const toppingConfigs: ToppingConfiguration[] = [];

      // Process existing selected toppings
      if (item.selectedToppings) {
        item.selectedToppings.forEach((selectedTopping) => {
          const customization = menuData.pizza_customizations.find(
            (c) => c.id === selectedTopping.id
          );
          if (customization) {
            toppingConfigs.push({
              id: customization.id,
              name: customization.name,
              category: customization.category,
              amount: selectedTopping.amount,
              calculatedPrice: selectedTopping.price,
              basePrice: customization.base_price,
              isPremium:
                customization.category.includes("premium") ||
                customization.category.includes("beef"),
              tier: getTierFromCategory(customization.category),
            });
          }
        });
      }

      // Add remaining toppings as "none"
      menuData.pizza_customizations
        .filter((c) => c.category.startsWith("topping_"))
        .forEach((customization) => {
          const existing = toppingConfigs.find(
            (t) => t.id === customization.id
          );
          if (!existing) {
            toppingConfigs.push({
              id: customization.id,
              name: customization.name,
              category: customization.category,
              amount: "none",
              calculatedPrice: 0,
              basePrice: customization.base_price,
              isPremium:
                customization.category.includes("premium") ||
                customization.category.includes("beef"),
              tier: getTierFromCategory(customization.category),
            });
          }
        });

      setToppings(toppingConfigs);

      // Initialize modifiers
      const modifierConfigs: ModifierConfiguration[] =
        menuData.pizza_customizations
          .filter((c) => !c.category.startsWith("topping_"))
          .map((c) => ({
            id: c.id,
            name: c.name,
            priceAdjustment: c.base_price,
            selected:
              item.selectedModifiers?.some((m) => m.id === c.id) || false,
          }));

      setModifiers(modifierConfigs);
    },
    [item]
  );

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      loadPizzaMenuData();
    }
  }, [isOpen, loadPizzaMenuData]);

  // ==========================================
  // PRICING CALCULATION
  // ==========================================

  const calculatePrice = useCallback(async () => {
    if (!selectedCrust || !pizzaMenuData) return;

    try {
      setIsCalculatingPrice(true);
      setPricingError(null);

      const toppingSelections = toppings
        .filter((t) => t.amount !== "none")
        .map((t) => ({
          id: t.id,
          amount: t.amount,
        }));

      console.log("💰 Calculating price for:", {
        size: selectedCrust.sizeCode,
        crust: selectedCrust.crustType,
        toppings: toppingSelections.length,
      });

      // Add this helper function:
      const findMatchingVariantId = (
        crust: CrustSelection,
        menuData: PizzaMenuResponse | null
      ): string | null => {
        if (!menuData) return null;

        const variant = menuData.pizza_items
          .flatMap((item) => item.variants)
          .find(
            (v) =>
              v.size_code === crust.sizeCode && v.crust_type === crust.crustType
          );

        return variant?.id || null;
      };

      const response = await fetch("/api/menu/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Create a matching variant ID from your pizza data
          variantId: selectedCrust
            ? findMatchingVariantId(selectedCrust, pizzaMenuData)
            : null,
          toppingSelections,
          restaurantId, // This should be in the body, not as a separate field
        }),
      });

      if (!response.ok) {
        throw new Error(`Pricing calculation failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      console.log("✅ Price calculated:", result.data);
      setCurrentPricing(result.data);
    } catch (error) {
      console.error("Error calculating price:", error);
      setPricingError(
        error instanceof Error ? error.message : "Failed to calculate price"
      );
    } finally {
      setIsCalculatingPrice(false);
    }
  }, [selectedCrust, toppings, restaurantId, pizzaMenuData]);

  // Debounced price calculation
  useEffect(() => {
    if (selectedCrust) {
      const timer = setTimeout(() => {
        calculatePrice();
      }, 500); // 500ms debounce

      return () => clearTimeout(timer);
    }
  }, [selectedCrust, toppings, calculatePrice]);

  // ==========================================
  // CRUST SELECTION LOGIC
  // ==========================================

  const availableCrusts = useMemo(() => {
    if (!selectedSize || !pizzaMenuData) return [];

    return pizzaMenuData.crust_pricing
      .filter((cp) => cp.size_code === selectedSize)
      .map((cp) => ({
        sizeCode: cp.size_code,
        crustType: cp.crust_type,
        basePrice: cp.base_price,
        upcharge: cp.upcharge,
        displayName: getCrustDisplayName(cp.crust_type, cp.size_code),
        isSpecial:
          cp.crust_type === "stuffed" || cp.crust_type === "gluten_free",
      }))
      .sort((a, b) => {
        // Sort: thin first, then double_dough, then special crusts
        const order = { thin: 1, double_dough: 2, gluten_free: 3, stuffed: 4 };
        const aOrder = order[a.crustType as keyof typeof order] || 999;
        const bOrder = order[b.crustType as keyof typeof order] || 999;
        return aOrder - bOrder;
      });
  }, [selectedSize, pizzaMenuData]);

  const handleSizeSelect = (sizeCode: string) => {
    console.log("📏 Size selected:", sizeCode);
    setSelectedSize(sizeCode);
    setSelectedCrust(null); // Reset crust selection
    setCurrentStep("crust");
  };

  const handleCrustSelect = (crust: CrustSelection) => {
    console.log("🍞 Crust selected:", crust);
    setSelectedCrust(crust);
    setCurrentStep("toppings");
  };

  // ==========================================
  // TOPPING MANAGEMENT
  // ==========================================

  const handleToppingChange = (toppingId: string, newAmount: ToppingAmount) => {
    console.log(`🍕 Changing topping ${toppingId} to ${newAmount}`);

    setToppings((prev) =>
      prev.map((topping) => {
        if (topping.id === toppingId) {
          // The price will be calculated by the API, so we'll update it when pricing comes back
          return { ...topping, amount: newAmount };
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
  // SAVE FUNCTIONALITY
  // ==========================================

  const handleSave = () => {
    if (!selectedCrust || !currentPricing) {
      console.error("❌ Cannot save without crust selection and pricing");
      return;
    }

    console.log("💾 Saving enhanced pizza customization...");

    // Create variant ID based on crust selection (you might need to adjust this based on your data structure)
    const matchingVariant = pizzaMenuData?.pizza_items
      .flatMap((pi) => pi.variants)
      .find(
        (v) =>
          v.size_code === selectedCrust.sizeCode &&
          v.crust_type === selectedCrust.crustType
      );

    const updatedItem: ConfiguredCartItem = {
      ...item,
      variantId: matchingVariant?.id || null,
      variantName: `${getSizeDisplayName(selectedCrust.sizeCode)} ${
        selectedCrust.displayName
      }`,
      basePrice: selectedCrust.basePrice,
      selectedToppings: toppings
        .filter((t) => t.amount !== "none")
        .map((t) => ({
          id: t.id,
          name: t.name,
          amount: t.amount,
          price:
            currentPricing.breakdown.find((b) => b.name.includes(t.name))
              ?.price || 0,
          isDefault: false,
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
      totalPrice: currentPricing.finalPrice,
      displayName: `${getSizeDisplayName(selectedCrust.sizeCode)} ${
        selectedCrust.displayName
      } ${item.menuItemName}`,
    };

    console.log("✅ Saved enhanced pizza:", updatedItem);
    onComplete(updatedItem);
  };

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const getCrustDisplayName = (crustType: string, sizeCode: string): string => {
    const baseNames: Record<string, string> = {
      thin: "Thin Crust",
      double_dough: "Double Dough",
      stuffed: "Stuffed Crust",
      gluten_free: "Gluten Free",
    };

    const baseName = baseNames[crustType] || crustType.replace("_", " ");

    if (crustType === "gluten_free" && sizeCode === "10in") {
      return `${baseName} (10" only)`;
    }

    return baseName;
  };

  const getSizeDisplayName = (sizeCode: string): string => {
    const sizeNames: Record<string, string> = {
      "10in": 'Small 10"',
      "12in": 'Medium 12"',
      "14in": 'Large 14"',
      "16in": 'X-Large 16"',
    };
    return sizeNames[sizeCode] || sizeCode;
  };

  const getTierFromCategory = (
    category: string
  ): "normal" | "premium" | "beef" => {
    if (category.includes("beef")) return "beef";
    if (category.includes("premium")) return "premium";
    return "normal";
  };

  const groupToppingsByCategory = useMemo(() => {
    return toppings.reduce((acc, topping) => {
      const categoryKey = topping.category.replace("topping_", "");
      const displayCategory = categoryKey === "normal" ? "meats" : categoryKey;

      if (!acc[displayCategory]) {
        acc[displayCategory] = [];
      }
      acc[displayCategory].push(topping);
      return acc;
    }, {} as Record<string, ToppingConfiguration[]>);
  }, [toppings]);

  // ==========================================
  // RENDER CONDITIONS
  // ==========================================

  if (!isOpen) return null;

  const canProceedToReview =
    selectedCrust && currentPricing && !isCalculatingPrice;
  const finalPrice = currentPricing?.finalPrice || 0;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize {item.menuItemName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedCrust ? (
                <>
                  <span className="font-medium">
                    {getSizeDisplayName(selectedCrust.sizeCode)}{" "}
                    {selectedCrust.displayName}
                  </span>
                  {currentPricing && (
                    <span className="ml-2">
                      • Est. {currentPricing.estimatedPrepTime || 15} min prep
                      time
                    </span>
                  )}
                </>
              ) : (
                "Choose your pizza size and crust"
              )}
            </p>
            {currentPricing?.warnings && currentPricing.warnings.length > 0 && (
              <div className="text-sm text-amber-600 mt-1">
                ⚠️ {currentPricing.warnings.join(", ")}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {isCalculatingPrice ? (
                <span className="text-gray-400">Calculating...</span>
              ) : (
                `$${finalPrice.toFixed(2)}`
              )}
            </div>
            <div className="text-sm text-gray-500">Current total</div>
            {pricingError && (
              <div className="text-sm text-red-600 mt-1">Pricing error</div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={loadPizzaMenuData} />
          ) : (
            <div className="p-6 space-y-6">
              {/* Size Selection */}
              <SizeSelectionSection
                availableSizes={pizzaMenuData?.available_sizes || []}
                selectedSize={selectedSize}
                onSizeSelect={handleSizeSelect}
                crustPricing={pizzaMenuData?.crust_pricing || []}
              />

              {/* Crust Selection */}
              {selectedSize && (
                <CrustSelectionSection
                  selectedSize={selectedSize}
                  availableCrusts={availableCrusts}
                  selectedCrust={selectedCrust}
                  onCrustSelect={handleCrustSelect}
                />
              )}

              {/* Topping Selection */}
              {selectedCrust && (
                <ToppingSelectionSection
                  toppingsByCategory={groupToppingsByCategory}
                  onToppingChange={handleToppingChange}
                  selectedSize={selectedCrust.sizeCode}
                />
              )}

              {/* Modifier Selection */}
              {selectedCrust && modifiers.length > 0 && (
                <ModifierSelectionSection
                  modifiers={modifiers}
                  onModifierChange={handleModifierChange}
                />
              )}

              {/* Special Instructions */}
              {selectedCrust && (
                <SpecialInstructionsSection
                  instructions={specialInstructions}
                  onChange={setSpecialInstructions}
                />
              )}

              {/* Price Breakdown */}
              {currentPricing && (
                <PriceBreakdownSection pricing={currentPricing} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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
                ${finalPrice.toFixed(2)}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!canProceedToReview}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {canProceedToReview ? "Update Cart" : "Choose Size & Crust"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SECTION COMPONENTS
// ==========================================

interface SizeSelectionSectionProps {
  availableSizes: string[];
  selectedSize: string;
  onSizeSelect: (size: string) => void;
  crustPricing: CrustPricing[];
}

function SizeSelectionSection({
  availableSizes,
  selectedSize,
  onSizeSelect,
  crustPricing,
}: SizeSelectionSectionProps) {
  const getSizeDisplayName = (sizeCode: string): string => {
    const sizeNames: Record<string, string> = {
      "10in": 'Small 10"',
      "12in": 'Medium 12"',
      "14in": 'Large 14"',
      "16in": 'X-Large 16"',
    };
    return sizeNames[sizeCode] || sizeCode;
  };

  const getMinPriceForSize = (sizeCode: string): number => {
    const sizePrices = crustPricing
      .filter((cp) => cp.size_code === sizeCode)
      .map((cp) => cp.base_price);
    return Math.min(...sizePrices);
  };

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Step 1: Choose Size
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {availableSizes.map((size) => (
          <button
            key={size}
            onClick={() => onSizeSelect(size)}
            className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
              selectedSize === size
                ? "border-blue-600 bg-blue-50 shadow-md"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-semibold text-gray-900">
              {getSizeDisplayName(size)}
            </div>
            <div className="text-sm font-medium text-green-600 mt-2">
              From ${getMinPriceForSize(size).toFixed(2)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

interface CrustSelectionSectionProps {
  selectedSize: string;
  availableCrusts: CrustSelection[];
  selectedCrust: CrustSelection | null;
  onCrustSelect: (crust: CrustSelection) => void;
}

function CrustSelectionSection({
  selectedSize,
  availableCrusts,
  selectedCrust,
  onCrustSelect,
}: CrustSelectionSectionProps) {
  const getSizeDisplayName = (sizeCode: string): string => {
    const sizeNames: Record<string, string> = {
      "10in": 'Small 10"',
      "12in": 'Medium 12"',
      "14in": 'Large 14"',
      "16in": 'X-Large 16"',
    };
    return sizeNames[sizeCode] || sizeCode;
  };

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Step 2: Choose Crust ({getSizeDisplayName(selectedSize)})
      </h3>
      <div className="space-y-3">
        {availableCrusts.map((crust) => (
          <label
            key={`${crust.sizeCode}-${crust.crustType}`}
            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
              selectedCrust?.crustType === crust.crustType
                ? "border-blue-600 bg-blue-50 shadow-md"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onCrustSelect(crust)}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="crust"
                value={crust.crustType}
                checked={selectedCrust?.crustType === crust.crustType}
                onChange={() => onCrustSelect(crust)}
                className="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-semibold text-gray-900 flex items-center">
                  {crust.displayName}
                  {crust.isSpecial && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Special
                    </span>
                  )}
                </div>
                {crust.upcharge > 0 && (
                  <div className="text-sm text-gray-600">
                    +${crust.upcharge.toFixed(2)} upcharge
                  </div>
                )}
              </div>
            </div>
            <div className="text-lg font-bold text-green-600">
              ${crust.basePrice.toFixed(2)}
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

interface ToppingSelectionSectionProps {
  toppingsByCategory: Record<string, ToppingConfiguration[]>;
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
  selectedSize: string;
}

function ToppingSelectionSection({
  toppingsByCategory,
  onToppingChange,
  selectedSize,
}: ToppingSelectionSectionProps) {
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      meats: "🥓",
      normal: "🥓",
      vegetables: "🥬",
      cheese: "🧀",
      sauce: "🍅",
      premium: "⭐",
      beef: "🥩",
    };
    return icons[category] || "🍕";
  };

  const getSizeDisplayName = (sizeCode: string): string => {
    const sizeNames: Record<string, string> = {
      "10in": "Small",
      "12in": "Medium",
      "14in": "Large",
      "16in": "X-Large",
    };
    return sizeNames[sizeCode] || sizeCode;
  };

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Step 3: Choose Toppings
        <span className="text-sm font-normal text-gray-600 ml-2">
          (Prices shown for {getSizeDisplayName(selectedSize)} size)
        </span>
      </h3>

      {Object.entries(toppingsByCategory).map(
        ([category, categoryToppings]) => (
          <div key={category} className="mb-6">
            <h4 className="text-base font-medium text-gray-800 mb-3 capitalize flex items-center">
              <span className="mr-2">{getCategoryIcon(category)}</span>
              {category}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryToppings.map((topping) => (
                <ToppingSelector
                  key={topping.id}
                  topping={topping}
                  onChange={(amount) => onToppingChange(topping.id, amount)}
                />
              ))}
            </div>
          </div>
        )
      )}
    </section>
  );
}

interface ToppingSelectorProps {
  topping: ToppingConfiguration;
  onChange: (amount: ToppingAmount) => void;
}

function ToppingSelector({ topping, onChange }: ToppingSelectorProps) {
  const amountOptions: {
    value: ToppingAmount;
    label: string;
    multiplier: string;
  }[] = [
    { value: "none", label: "None", multiplier: "" },
    { value: "light", label: "Light", multiplier: "0.75x" },
    { value: "normal", label: "Normal", multiplier: "1x" },
    { value: "extra", label: "Extra", multiplier: "2x" },
    { value: "xxtra", label: "XXtra", multiplier: "3x" },
  ];

  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        topping.amount !== "none"
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200"
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{topping.name}</span>
          {topping.isPremium && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              {topping.tier === "beef" ? "Premium Beef" : "Premium"}
            </span>
          )}
        </div>
        {topping.calculatedPrice > 0 && (
          <span className="text-sm font-semibold text-green-600">
            +${topping.calculatedPrice.toFixed(2)}
          </span>
        )}
      </div>

      <select
        value={topping.amount}
        onChange={(e) => onChange(e.target.value as ToppingAmount)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {amountOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} {option.multiplier && `(${option.multiplier})`}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ModifierSelectionSectionProps {
  modifiers: ModifierConfiguration[];
  onModifierChange: (modifierId: string, selected: boolean) => void;
}

function ModifierSelectionSection({
  modifiers,
  onModifierChange,
}: ModifierSelectionSectionProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Step 4: Special Preparations
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modifiers.map((modifier) => (
          <ModifierSelector
            key={modifier.id}
            modifier={modifier}
            onChange={(selected) => onModifierChange(modifier.id, selected)}
          />
        ))}
      </div>
    </section>
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

interface SpecialInstructionsSectionProps {
  instructions: string;
  onChange: (instructions: string) => void;
}

function SpecialInstructionsSection({
  instructions,
  onChange,
}: SpecialInstructionsSectionProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Special Instructions
      </h3>
      <textarea
        placeholder="Any special requests for this pizza..."
        value={instructions}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </section>
  );
}

interface PriceBreakdownSectionProps {
  pricing: PizzaPriceCalculationResponse;
}

function PriceBreakdownSection({ pricing }: PriceBreakdownSectionProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Price Breakdown
      </h3>
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        {pricing.breakdown.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center text-sm"
          >
            <span className="text-gray-700">
              {item.name}
              {item.amount && ` (${item.amount})`}
            </span>
            <span className="font-semibold text-gray-900">
              +${item.price.toFixed(2)}
            </span>
          </div>
        ))}

        {pricing.substitutionCredit > 0 && (
          <div className="flex justify-between items-center text-sm border-t pt-2">
            <span className="text-green-700">Substitution Credit</span>
            <span className="font-semibold text-green-600">
              -${pricing.substitutionCredit.toFixed(2)}
            </span>
          </div>
        )}

        <div className="border-t pt-2 flex justify-between items-center font-bold text-base">
          <span className="text-gray-900">Total</span>
          <span className="text-green-600">
            ${pricing.finalPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// LOADING & ERROR STATES
// ==========================================

function LoadingState() {
  return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Loading Pizza Menu
      </h3>
      <p className="text-gray-600">Getting crust options and toppings...</p>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="p-8 text-center">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Failed to Load Pizza Menu
      </h3>
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// src/components/features/orders/EnhancedPizzaCustomizer.tsx
"use client";
import type {
  ConfiguredCartItem,
  ToppingAmount,
  PizzaMenuResponse,
  PizzaPriceCalculationResponse,
  PizzaCustomization,
  CrustPricing,
} from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

/**
 * 🍕 ENHANCED PIZZA CUSTOMIZER - FIXED VERSION
 *
 * FIXES:
 * ✅ Real-time pricing calculation
 * ✅ Default thin crust selection
 * ✅ Filters out stuffed crust (belongs to stuffed pizza category)
 * ✅ Compact topping display
 * ✅ Active toppings shown first
 * ✅ Proper API integration
 */

// ===================================================================
// INTERFACES
// ===================================================================

interface ToppingState {
  id: string;
  name: string;
  category: string;
  amount: ToppingAmount;
  basePrice: number;
  calculatedPrice: number;
  isActive: boolean;
  isSpecialtyDefault: boolean;
  tier: "normal" | "premium" | "beef";
}

interface CrustOption {
  sizeCode: string;
  crustType: string;
  basePrice: number;
  upcharge: number;
  displayName: string;
}

interface EnhancedPizzaCustomizerProps {
  item: ConfiguredCartItem;
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

const getSizeDisplayName = (sizeCode: string): string => {
  const sizeNames: Record<string, string> = {
    "10in": 'Small 10"',
    "12in": 'Medium 12"',
    "14in": 'Large 14"',
    "16in": 'X-Large 16"',
  };
  return sizeNames[sizeCode] || sizeCode;
};

const getCrustDisplayName = (crustType: string): string => {
  const crustNames: Record<string, string> = {
    thin: "Thin Crust",
    double_dough: "Double Dough",
    gluten_free: "Gluten Free",
  };
  return crustNames[crustType] || crustType;
};

const getTierFromCategory = (
  category: string
): "normal" | "premium" | "beef" => {
  if (category.includes("beef")) return "beef";
  if (category.includes("premium")) return "premium";
  return "normal";
};

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function EnhancedPizzaCustomizer({
  item,
  onComplete,
  onCancel,
  isOpen,
  restaurantId,
}: EnhancedPizzaCustomizerProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pizzaMenuData, setPizzaMenuData] = useState<PizzaMenuResponse | null>(
    null
  );

  // Selection states
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedCrust, setSelectedCrust] = useState<CrustOption | null>(null);
  const [toppings, setToppings] = useState<ToppingState[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    item.specialInstructions || ""
  );

  // 🆕 FIXED: Real pricing states
  const [currentPricing, setCurrentPricing] =
    useState<PizzaPriceCalculationResponse | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // ==========================================
  // LOAD PIZZA MENU DATA
  // ==========================================

  const loadPizzaMenuData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🍕 Loading enhanced pizza menu data...");

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

      // 🆕 AUTO-SELECT DEFAULT SIZE AND CRUST
      const availableSizes = result.data.available_sizes || [];
      const defaultSize = availableSizes.includes("12in")
        ? "12in"
        : availableSizes[0];

      if (defaultSize) {
        setSelectedSize(defaultSize);

        // 🆕 AUTO-SELECT THIN CRUST (excluding stuffed)
        const thinCrustForSize = result.data.crust_pricing.find(
          (cp: CrustPricing) =>
            cp.size_code === defaultSize && cp.crust_type === "thin"
        );

        if (thinCrustForSize) {
          const defaultCrust: CrustOption = {
            sizeCode: thinCrustForSize.size_code,
            crustType: thinCrustForSize.crust_type,
            basePrice: thinCrustForSize.base_price,
            upcharge: thinCrustForSize.upcharge,
            displayName: getCrustDisplayName(thinCrustForSize.crust_type),
          };
          setSelectedCrust(defaultCrust);
        }
      }

      // Initialize toppings
      initializeToppings(result.data);
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

  // ==========================================
  // INITIALIZE TOPPINGS
  // ==========================================

  const initializeToppings = (menuData: PizzaMenuResponse) => {
    const toppingConfigs: ToppingState[] = [];

    // Get pizza toppings from customizations
    const pizzaToppings = menuData.pizza_customizations.filter(
      (c: PizzaCustomization) => c.category.startsWith("topping_")
    );

    pizzaToppings.forEach((customization: PizzaCustomization) => {
      // Check if this topping was already selected in the cart item
      const existingTopping = item.selectedToppings?.find(
        (t) => t.id === customization.id
      );

      toppingConfigs.push({
        id: customization.id,
        name: customization.name,
        category: customization.category,
        amount: existingTopping?.amount || "none",
        basePrice: customization.base_price,
        calculatedPrice: existingTopping?.price || 0,
        isActive: existingTopping ? existingTopping.amount !== "none" : false,
        isSpecialtyDefault: existingTopping?.isDefault || false,
        tier: getTierFromCategory(customization.category),
      });
    });

    // 🆕 SORT: Active/specialty toppings first, then by name
    toppingConfigs.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (a.isSpecialtyDefault && !b.isSpecialtyDefault) return -1;
      if (!a.isSpecialtyDefault && b.isSpecialtyDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    setToppings(toppingConfigs);
  };

  // ==========================================
  // REAL-TIME PRICING CALCULATION
  // ==========================================

  const calculatePrice = useCallback(async () => {
    if (!selectedCrust || !pizzaMenuData) {
      return;
    }

    try {
      setIsCalculatingPrice(true);
      setPricingError(null);

      const activeToppings = toppings
        .filter((t) => t.amount !== "none")
        .map((t) => ({
          customization_id: t.id,
          amount: t.amount,
        }));

      console.log("💰 Calculating price for:", {
        size: selectedCrust.sizeCode,
        crust: selectedCrust.crustType,
        toppings: activeToppings.length,
      });

      // 🆕 CALL YOUR DATABASE PRICING FUNCTION
      const response = await fetch("/api/menu/pizza/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          size_code: selectedCrust.sizeCode,
          crust_type: selectedCrust.crustType,
          toppings: activeToppings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate price");
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
        error instanceof Error ? error.message : "Pricing calculation failed"
      );
    } finally {
      setIsCalculatingPrice(false);
    }
  }, [selectedCrust, toppings, pizzaMenuData, restaurantId]);

  // 🆕 TRIGGER PRICE CALCULATION WHEN SELECTIONS CHANGE
  useEffect(() => {
    if (selectedCrust && toppings.length > 0) {
      const timeoutId = setTimeout(() => {
        calculatePrice();
      }, 300); // Debounce for 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [selectedCrust, toppings, calculatePrice]);

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      loadPizzaMenuData();
    }
  }, [isOpen, loadPizzaMenuData]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleSizeSelect = (sizeCode: string) => {
    console.log("📏 Size selected:", sizeCode);
    setSelectedSize(sizeCode);

    // Auto-select thin crust for new size (excluding stuffed)
    const thinCrustForSize = pizzaMenuData?.crust_pricing.find(
      (cp: CrustPricing) =>
        cp.size_code === sizeCode && cp.crust_type === "thin"
    );

    if (thinCrustForSize) {
      const newCrust: CrustOption = {
        sizeCode: thinCrustForSize.size_code,
        crustType: thinCrustForSize.crust_type,
        basePrice: thinCrustForSize.base_price,
        upcharge: thinCrustForSize.upcharge,
        displayName: getCrustDisplayName(thinCrustForSize.crust_type),
      };
      setSelectedCrust(newCrust);
    }
  };

  const handleCrustSelect = (crust: CrustOption) => {
    console.log("🍞 Crust selected:", crust);
    setSelectedCrust(crust);
  };

  const handleToppingChange = (toppingId: string, newAmount: ToppingAmount) => {
    console.log(`🍕 Changing topping ${toppingId} to ${newAmount}`);
    setToppings((prev) =>
      prev.map((topping) =>
        topping.id === toppingId
          ? { ...topping, amount: newAmount, isActive: newAmount !== "none" }
          : topping
      )
    );
  };

  const handleSave = () => {
    if (!selectedCrust || !currentPricing) {
      console.error("❌ Cannot save without crust selection and pricing");
      return;
    }

    console.log("💾 Saving enhanced pizza customization...");

    const updatedItem: ConfiguredCartItem = {
      ...item,
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
          price: t.calculatedPrice,
          isDefault: t.isSpecialtyDefault,
          category: t.category,
        })),
      selectedModifiers: [], // Can add modifiers later
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
  // RENDER CONDITIONS
  // ==========================================

  if (!isOpen) return null;

  const availableCrusts =
    selectedSize && pizzaMenuData
      ? pizzaMenuData.crust_pricing
          .filter(
            (cp: CrustPricing) =>
              cp.size_code === selectedSize && cp.crust_type !== "stuffed" // 🆕 EXCLUDE STUFFED CRUST
          )
          .map((cp: CrustPricing) => ({
            sizeCode: cp.size_code,
            crustType: cp.crust_type,
            basePrice: cp.base_price,
            upcharge: cp.upcharge,
            displayName: getCrustDisplayName(cp.crust_type),
          }))
      : [];

  const finalPrice =
    currentPricing?.finalPrice || selectedCrust?.basePrice || 0;
  const canSave = selectedCrust && !isCalculatingPrice;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize {item.menuItemName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedCrust ? (
                <span className="font-medium">
                  {getSizeDisplayName(selectedCrust.sizeCode)}{" "}
                  {selectedCrust.displayName}
                </span>
              ) : (
                "Choose your pizza size and crust"
              )}
            </p>
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
              <SizeSelection
                availableSizes={pizzaMenuData?.available_sizes || []}
                selectedSize={selectedSize}
                onSizeSelect={handleSizeSelect}
                crustPricing={pizzaMenuData?.crust_pricing || []}
              />

              {/* Crust Selection */}
              {selectedSize && (
                <CrustSelection
                  selectedSize={selectedSize}
                  availableCrusts={availableCrusts}
                  selectedCrust={selectedCrust}
                  onCrustSelect={handleCrustSelect}
                />
              )}

              {/* 🆕 COMPACT TOPPING SELECTION */}
              {selectedCrust && toppings.length > 0 && (
                <CompactToppingSelection
                  toppings={toppings}
                  onToppingChange={handleToppingChange}
                  selectedSize={selectedCrust.sizeCode}
                />
              )}

              {/* Special Instructions */}
              {selectedCrust && (
                <SpecialInstructions
                  instructions={specialInstructions}
                  onChange={setSpecialInstructions}
                />
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
              disabled={!canSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {canSave ? "Update Cart" : "Loading..."}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function SizeSelection({
  availableSizes,
  selectedSize,
  onSizeSelect,
  crustPricing,
}: {
  availableSizes: string[];
  selectedSize: string;
  onSizeSelect: (size: string) => void;
  crustPricing: CrustPricing[];
}) {
  const getMinPriceForSize = (sizeCode: string): number => {
    const sizePrices = crustPricing
      .filter((cp) => cp.size_code === sizeCode && cp.crust_type !== "stuffed")
      .map((cp) => cp.base_price);
    return sizePrices.length > 0 ? Math.min(...sizePrices) : 0;
  };

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Size</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {availableSizes.map((size) => (
          <button
            key={size}
            onClick={() => onSizeSelect(size)}
            className={`p-4 rounded-lg border-2 transition-all text-center hover:shadow-md ${
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

function CrustSelection({
  selectedSize,
  availableCrusts,
  selectedCrust,
  onCrustSelect,
}: {
  selectedSize: string;
  availableCrusts: CrustOption[];
  selectedCrust: CrustOption | null;
  onCrustSelect: (crust: CrustOption) => void;
}) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Choose Crust ({getSizeDisplayName(selectedSize)})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {availableCrusts.map((crust) => (
          <button
            key={`${crust.sizeCode}-${crust.crustType}`}
            onClick={() => onCrustSelect(crust)}
            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
              selectedCrust?.crustType === crust.crustType
                ? "border-blue-600 bg-blue-50 shadow-md"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-semibold text-gray-900">
              {crust.displayName}
            </div>
            <div className="text-lg font-bold text-green-600 mt-2">
              ${crust.basePrice.toFixed(2)}
            </div>
            {crust.upcharge > 0 && (
              <div className="text-sm text-gray-600">
                +${crust.upcharge.toFixed(2)} upcharge
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

// 🆕 COMPACT TOPPING SELECTION
function CompactToppingSelection({
  toppings,
  onToppingChange,
  selectedSize,
}: {
  toppings: ToppingState[];
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
  selectedSize: string;
}) {
  // Group toppings by category for better organization
  const groupedToppings = toppings.reduce((acc, topping) => {
    const category = topping.category.replace("topping_", "");
    if (!acc[category]) acc[category] = [];
    acc[category].push(topping);
    return acc;
  }, {} as Record<string, ToppingState[]>);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      normal: "🥓",
      premium: "⭐",
      beef: "🥩",
      cheese: "🧀",
      sauce: "🍅",
    };
    return icons[category] || "🍕";
  };

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Choose Toppings
        <span className="text-sm font-normal text-gray-600 ml-2">
          (Prices for {getSizeDisplayName(selectedSize)})
        </span>
      </h3>

      {Object.entries(groupedToppings).map(([category, categoryToppings]) => (
        <div key={category} className="mb-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2 capitalize flex items-center">
            <span className="mr-1">{getCategoryIcon(category)}</span>
            {category === "normal" ? "Meats" : category}
          </h4>

          {/* 🆕 COMPACT GRID - MORE TOPPINGS VISIBLE */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {categoryToppings.map((topping) => (
              <div
                key={topping.id}
                className={`border rounded-lg p-2 transition-all ${
                  topping.isActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {topping.name}
                  </span>
                  {topping.tier !== "normal" && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                      {topping.tier === "beef" ? "🥩" : "⭐"}
                    </span>
                  )}
                </div>

                <select
                  value={topping.amount}
                  onChange={(e) =>
                    onToppingChange(topping.id, e.target.value as ToppingAmount)
                  }
                  className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="none">None</option>
                  <option value="light">Light</option>
                  <option value="normal">Normal</option>
                  <option value="extra">Extra</option>
                  <option value="xxtra">XXtra</option>
                </select>

                {topping.calculatedPrice > 0 && (
                  <div className="text-xs font-semibold text-green-600 mt-1">
                    +${topping.calculatedPrice.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function SpecialInstructions({
  instructions,
  onChange,
}: {
  instructions: string;
  onChange: (instructions: string) => void;
}) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Special Instructions
      </h3>
      <textarea
        placeholder="Any special requests for this pizza..."
        value={instructions}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </section>
  );
}

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

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
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

// src/components/features/orders/PizzaCustomizer.tsx - FIXED INFINITE LOOP & STATE ISSUES
"use client";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import type {
  ConfiguredCartItem,
  ToppingAmount,
  PizzaMenuResponse,
  PizzaPriceCalculationResponse,
  Customization,
  CrustPricing,
} from "@/lib/types";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";

interface ToppingState {
  id: string;
  name: string;
  category: string;
  displayCategory: string;
  amount: ToppingAmount;
  basePrice: number;
  calculatedPrice: number;
  isActive: boolean;
  isSpecialtyDefault: boolean;
  tier: "normal" | "premium" | "beef";
  icon: string;
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

// CATEGORIZATION CONFIG
const TOPPING_CATEGORIES = {
  meats: {
    displayName: "Meats & Proteins",
    icon: "🥓",
    keywords: [
      "pepperoni",
      "sausage",
      "bacon",
      "canadian bacon",
      "salami",
      "ham",
      "chicken",
      "meatball",
      "beef",
    ],
  },
  vegetables: {
    displayName: "Vegetables & Fruits",
    icon: "🥬",
    keywords: [
      "mushroom",
      "onion",
      "pepper",
      "olive",
      "tomato",
      "spinach",
      "basil",
      "pineapple",
      "giardiniera",
    ],
  },
  cheese: {
    displayName: "Cheese",
    icon: "🧀",
    keywords: [
      "mozzarella",
      "feta",
      "parmesan",
      "goat cheese",
      "ricotta",
      "cheese",
    ],
  },
  sauces: {
    displayName: "Sauces",
    icon: "🍅",
    keywords: ["alfredo", "bbq", "garlic butter", "sauce", "no sauce"],
  },
};

// HELPER FUNCTIONS
const getSizeDisplayName = (sizeCode: string): string => {
  const sizeNames: Record<string, string> = {
    small: 'Small 10"',
    medium: 'Medium 12"',
    large: 'Large 14"',
    xlarge: 'X-Large 16"',
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

const getDisplayCategory = (
  customization: Customization
): { category: string; icon: string } => {
  const name = customization.name.toLowerCase();

  for (const [categoryKey, categoryConfig] of Object.entries(
    TOPPING_CATEGORIES
  )) {
    if (categoryConfig.keywords.some((keyword) => name.includes(keyword))) {
      return {
        category: categoryKey,
        icon: categoryConfig.icon,
      };
    }
  }

  return { category: "other", icon: "🍕" };
};

const getTierFromCategory = (
  category: string
): "normal" | "premium" | "beef" => {
  if (category.includes("beef")) return "beef";
  if (category.includes("premium")) return "premium";
  return "normal";
};

export default function EnhancedPizzaCustomizer({
  item,
  onComplete,
  onCancel,
  isOpen,
  restaurantId,
}: EnhancedPizzaCustomizerProps) {
  // STATE MANAGEMENT
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

  // Pricing states
  const [currentPricing, setCurrentPricing] =
    useState<PizzaPriceCalculationResponse | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // 🔧 FIX #1: Use ref to prevent infinite loops in pricing calculation
  const lastPricingRequest = useRef<string | null>(null);
  const pricingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // MEMOIZED VALUES
  const activeToppings = useMemo(
    () =>
      toppings
        .filter((t) => t.amount !== "none")
        .map((t) => ({
          customization_id: t.id,
          amount: t.amount,
        })),
    [toppings]
  );

  // 🔧 FIX #1: Better memoization to prevent unnecessary recalculations
  const pricingRequestKey = useMemo(() => {
    if (!selectedCrust) return null;
    const key = JSON.stringify({
      menuItemId: item.menuItemId, // Include menu item ID for specialty detection
      size: selectedCrust.sizeCode,
      crust: selectedCrust.crustType,
      toppings: activeToppings,
    });
    return key;
  }, [selectedCrust, activeToppings, item.menuItemId]);

  // LOAD PIZZA MENU DATA
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

      // 🔧 FIX #2: Preserve existing cart item state when possible
      if (item.variantName && item.selectedToppings) {
        console.log("🔄 Restoring cart item state:", {
          variantName: item.variantName,
          toppingsCount: item.selectedToppings.length,
        });

        // Try to extract size from variant name
        const extractedSize = extractSizeFromVariantName(item.variantName);
        if (extractedSize) {
          setSelectedSize(extractedSize);

          // Find matching crust
          const extractedCrust = extractCrustFromVariantName(item.variantName);
          const matchingCrust = result.data.crust_pricing.find(
            (cp: CrustPricing) => {
              const matchesSize =
                cp.size_code === extractedSize ||
                (extractedSize === "medium" && cp.size_code === "12in") ||
                (extractedSize === "small" && cp.size_code === "10in") ||
                (extractedSize === "large" && cp.size_code === "14in") ||
                (extractedSize === "xlarge" && cp.size_code === "16in");

              return (
                matchesSize && cp.crust_type === (extractedCrust || "thin")
              );
            }
          );

          if (matchingCrust) {
            const restoredCrust: CrustOption = {
              sizeCode: extractedSize,
              crustType: matchingCrust.crust_type,
              basePrice: matchingCrust.base_price,
              upcharge: matchingCrust.upcharge,
              displayName: getCrustDisplayName(matchingCrust.crust_type),
            };
            setSelectedCrust(restoredCrust);
          }
        }
      } else {
        // Auto-select defaults for new items
        const availableSizes = result.data.available_sizes || [];
        const defaultSize = availableSizes.includes("medium")
          ? "medium"
          : availableSizes[0];

        if (defaultSize) {
          setSelectedSize(defaultSize);

          const thinCrustForSize = result.data.crust_pricing.find(
            (cp: CrustPricing) => {
              const matchesSize =
                cp.size_code === defaultSize ||
                (defaultSize === "medium" && cp.size_code === "12in") ||
                (defaultSize === "small" && cp.size_code === "10in") ||
                (defaultSize === "large" && cp.size_code === "14in") ||
                (defaultSize === "xlarge" && cp.size_code === "16in");

              return matchesSize && cp.crust_type === "thin";
            }
          );

          if (thinCrustForSize) {
            const defaultCrust: CrustOption = {
              sizeCode: defaultSize,
              crustType: thinCrustForSize.crust_type,
              basePrice: thinCrustForSize.base_price,
              upcharge: thinCrustForSize.upcharge,
              displayName: getCrustDisplayName(thinCrustForSize.crust_type),
            };
            setSelectedCrust(defaultCrust);
          }
        }
      }

      initializeToppingsWithTemplates(result.data);
    } catch (error) {
      console.error("Error loading pizza menu:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load pizza menu"
      );
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, item.variantName, item.selectedToppings]);

  // Helper functions to extract size/crust from variant name
  const extractSizeFromVariantName = (variantName: string): string | null => {
    const sizeMap = {
      'Small 10"': "small",
      'Medium 12"': "medium",
      'Large 14"': "large",
      'X-Large 16"': "xlarge",
    };

    for (const [displayName, sizeCode] of Object.entries(sizeMap)) {
      if (variantName.includes(displayName)) {
        return sizeCode;
      }
    }
    return null;
  };

  const extractCrustFromVariantName = (variantName: string): string | null => {
    if (variantName.includes("Double Dough")) return "double_dough";
    if (variantName.includes("Gluten Free")) return "gluten_free";
    return "thin"; // Default
  };

  // INITIALIZE TOPPINGS WITH TEMPLATE SUPPORT
  const initializeToppingsWithTemplates = useCallback(
    (menuData: PizzaMenuResponse) => {
      const toppingConfigs: ToppingState[] = [];

      const pizzaToppings = menuData.pizza_customizations.filter(
        (c: Customization) => c.category.startsWith("topping_")
      );

      // Find pizza template by menu item ID
      const template = menuData.pizza_templates.find(
        (t) => t.menu_item_id === item.menuItemId
      );
      const templateToppings = template?.template_toppings || [];

      console.log("🍕 Template lookup:", {
        menuItemId: item.menuItemId,
        templateFound: !!template,
        templateName: template?.name,
        defaultToppings: templateToppings.length,
      });

      pizzaToppings.forEach((customization: Customization) => {
        const templateTopping = templateToppings.find(
          (tt) => tt.customization_id === customization.id
        );

        // 🔧 FIX #2: Restore existing topping states from cart item
        const existingTopping = item.selectedToppings?.find(
          (t) => t.id === customization.id
        );

        const { category: displayCategory, icon } =
          getDisplayCategory(customization);

        let defaultAmount: ToppingAmount = "none";
        let isSpecialtyDefault = false;

        if (templateTopping) {
          defaultAmount = templateTopping.default_amount as ToppingAmount;
          isSpecialtyDefault = true;
        }

        // Override with existing cart state if available
        if (existingTopping) {
          defaultAmount = existingTopping.amount;
        }

        const isActive = defaultAmount !== "none";

        toppingConfigs.push({
          id: customization.id,
          name: customization.name,
          category: customization.category,
          displayCategory,
          amount: defaultAmount,
          basePrice: customization.base_price,
          calculatedPrice: existingTopping?.price || 0,
          isActive,
          isSpecialtyDefault,
          tier: getTierFromCategory(customization.category),
          icon,
        });
      });

      toppingConfigs.sort((a, b) => {
        if (a.isSpecialtyDefault && !b.isSpecialtyDefault) return -1;
        if (!a.isSpecialtyDefault && b.isSpecialtyDefault) return 1;
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log("🍕 Initialized toppings:", {
        total: toppingConfigs.length,
        active: toppingConfigs.filter((t) => t.isActive).length,
        specialtyDefaults: toppingConfigs.filter((t) => t.isSpecialtyDefault)
          .length,
      });

      setToppings(toppingConfigs);
    },
    [item.menuItemId, item.selectedToppings]
  );

  // 🔧 FIX #1: IMPROVED PRICING CALCULATION WITH LOOP PREVENTION
  const calculatePrice = useCallback(async () => {
    if (!selectedCrust || !pizzaMenuData || !pricingRequestKey) {
      return;
    }

    // Prevent duplicate requests
    if (lastPricingRequest.current === pricingRequestKey) {
      console.log("⏭️ Skipping duplicate pricing request");
      return;
    }

    try {
      setIsCalculatingPrice(true);
      setPricingError(null);
      lastPricingRequest.current = pricingRequestKey;

      const activeToppings = toppings
        .filter((t) => t.amount !== "none")
        .map((t) => ({
          customization_id: t.id,
          amount: t.amount,
        }));

      console.log("💰 Calculating price for:", {
        menuItemId: item.menuItemId,
        size: selectedCrust.sizeCode,
        crust: selectedCrust.crustType,
        toppings: activeToppings.length,
      });

      const response = await fetch("/api/menu/pizza/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          menu_item_id: item.menuItemId,
          size_code: selectedCrust.sizeCode,
          crust_type: selectedCrust.crustType,
          toppings: activeToppings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to calculate price");
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      console.log("✅ Pizza price calculated:", result.data);
      setCurrentPricing(result.data);

      // 🔧 FIX #1: Update topping prices WITHOUT triggering state loops
      if (result.data.breakdown) {
        setToppings((prevToppings) =>
          prevToppings.map((topping) => {
            const breakdownItem = result.data.breakdown.find(
              (item: { name: string; type: string; price: number }) =>
                item.name.toLowerCase().includes(topping.name.toLowerCase()) &&
                (item.type === "topping" ||
                  item.type === "template_default" ||
                  item.type === "template_extra")
            );

            // Only update if price actually changed to prevent unnecessary re-renders
            const newPrice = breakdownItem?.price || 0;
            if (topping.calculatedPrice !== newPrice) {
              return {
                ...topping,
                calculatedPrice: newPrice,
              };
            }
            return topping;
          })
        );
      }
    } catch (error) {
      console.error("Error calculating price:", error);
      setPricingError(
        error instanceof Error ? error.message : "Pricing calculation failed"
      );
    } finally {
      setIsCalculatingPrice(false);
    }
  }, [
    selectedCrust,
    toppings,
    pizzaMenuData,
    restaurantId,
    item.menuItemId,
    pricingRequestKey,
  ]);

  // 🔧 FIX #1: Better debounced pricing calculation
  useEffect(() => {
    if (pricingRequestKey && !isLoading) {
      // Clear existing timeout
      if (pricingTimeoutRef.current) {
        clearTimeout(pricingTimeoutRef.current);
      }

      // Set new timeout
      pricingTimeoutRef.current = setTimeout(() => {
        calculatePrice();
      }, 500); // Increased debounce time

      return () => {
        if (pricingTimeoutRef.current) {
          clearTimeout(pricingTimeoutRef.current);
        }
      };
    }
  }, [pricingRequestKey, calculatePrice, isLoading]);

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      loadPizzaMenuData();
    }
  }, [isOpen, loadPizzaMenuData]);

  // EVENT HANDLERS
  const handleSizeSelect = (sizeCode: string) => {
    console.log("📏 Size selected:", sizeCode);
    setSelectedSize(sizeCode);

    // Auto-select thin crust for new size
    const thinCrustForSize = pizzaMenuData?.crust_pricing.find(
      (cp: CrustPricing) => {
        const matchesSize =
          cp.size_code === sizeCode ||
          (sizeCode === "medium" && cp.size_code === "12in") ||
          (sizeCode === "small" && cp.size_code === "10in") ||
          (sizeCode === "large" && cp.size_code === "14in") ||
          (sizeCode === "xlarge" && cp.size_code === "16in");

        return matchesSize && cp.crust_type === "thin";
      }
    );

    if (thinCrustForSize) {
      const newCrust: CrustOption = {
        sizeCode: sizeCode,
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
      basePrice: currentPricing.basePrice,
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
      selectedModifiers: [],
      specialInstructions,
      totalPrice: currentPricing.finalPrice,
      displayName: `${getSizeDisplayName(selectedCrust.sizeCode)} ${
        selectedCrust.displayName
      } ${item.menuItemName}`,
    };

    console.log("✅ Saved enhanced pizza:", updatedItem);
    onComplete(updatedItem);
  };

  // RENDER CONDITIONS
  if (!isOpen) return null;

  // Get available crusts for selected size
  const availableCrusts =
    selectedSize && pizzaMenuData
      ? pizzaMenuData.crust_pricing
          .filter((cp: CrustPricing) => {
            const matchesSize =
              cp.size_code === selectedSize ||
              (selectedSize === "medium" && cp.size_code === "12in") ||
              (selectedSize === "small" && cp.size_code === "10in") ||
              (selectedSize === "large" && cp.size_code === "14in") ||
              (selectedSize === "xlarge" && cp.size_code === "16in");

            return matchesSize && cp.crust_type !== "stuffed";
          })
          .map((cp: CrustPricing) => ({
            sizeCode: selectedSize,
            crustType: cp.crust_type,
            basePrice: cp.base_price,
            upcharge: cp.upcharge,
            displayName: getCrustDisplayName(cp.crust_type),
          }))
      : [];

  const finalPrice =
    currentPricing?.finalPrice || selectedCrust?.basePrice || 0;
  const canSave = selectedCrust && !isCalculatingPrice;

  // RENDER
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
              <div className="text-sm text-red-600 mt-1">{pricingError}</div>
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
                pizzaMenuData={pizzaMenuData}
                menuItemId={item.menuItemId} // 🔧 FIX #3: Pass menu item ID for correct pricing
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

              {/* Topping Selection */}
              {selectedCrust && toppings.length > 0 && (
                <ToppingSelection
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
              {canSave ? "Update Cart" : <LoadingScreen />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔧 FIX #3: UPDATED SIZE SELECTION WITH CORRECT SPECIALTY PIZZA PRICING
function SizeSelection({
  availableSizes,
  selectedSize,
  onSizeSelect,
  pizzaMenuData,
  menuItemId,
}: {
  availableSizes: string[];
  selectedSize: string;
  onSizeSelect: (size: string) => void;
  pizzaMenuData: PizzaMenuResponse | null;
  menuItemId: string;
}) {
  const getMinPriceForSize = (sizeCode: string): number => {
    if (!pizzaMenuData) return 0;

    // Check if this is a specialty pizza
    const template = pizzaMenuData.pizza_templates.find(
      (t) => t.menu_item_id === menuItemId
    );

    if (template) {
      // For specialty pizzas, find the variant price
      const specialtyItem = pizzaMenuData.pizza_items.find(
        (item) => item.id === menuItemId
      );

      if (specialtyItem) {
        const variant = specialtyItem.variants.find(
          (v) => v.size_code === sizeCode && v.crust_type === "thin"
        );
        if (variant) {
          return variant.price;
        }
      }
    }

    // For regular pizzas, use crust pricing
    const sizePrices = pizzaMenuData.crust_pricing
      .filter((cp) => {
        const matchesSize =
          cp.size_code === sizeCode ||
          (sizeCode === "medium" && cp.size_code === "12in") ||
          (sizeCode === "small" && cp.size_code === "10in") ||
          (sizeCode === "large" && cp.size_code === "14in") ||
          (sizeCode === "xlarge" && cp.size_code === "16in");

        return matchesSize && cp.crust_type !== "stuffed";
      })
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

function ToppingSelection({
  toppings,
  onToppingChange,
  selectedSize,
}: {
  toppings: ToppingState[];
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
  selectedSize: string;
}) {
  const groupedToppings = toppings.reduce((acc, topping) => {
    const category = topping.displayCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(topping);
    return acc;
  }, {} as Record<string, ToppingState[]>);

  const getCategoryDisplayName = (category: string) => {
    const config =
      TOPPING_CATEGORIES[category as keyof typeof TOPPING_CATEGORIES];
    return (
      config?.displayName ||
      category.charAt(0).toUpperCase() + category.slice(1)
    );
  };

  const getCategoryIcon = (category: string) => {
    const config =
      TOPPING_CATEGORIES[category as keyof typeof TOPPING_CATEGORIES];
    return config?.icon || "🍕";
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
        <div key={category} className="mb-6">
          <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
            <span className="mr-2 text-lg">{getCategoryIcon(category)}</span>
            {getCategoryDisplayName(category)}
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoryToppings.map((topping: ToppingState) => (
              <div
                key={topping.id}
                className={`border rounded-lg p-3 transition-all ${
                  topping.isActive
                    ? topping.isSpecialtyDefault
                      ? "border-purple-500 bg-purple-50 shadow-sm"
                      : "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 leading-tight">
                    {topping.name}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    {topping.isSpecialtyDefault && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded font-medium">
                        INCLUDED
                      </span>
                    )}
                    {topping.tier !== "normal" && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded font-medium">
                        {topping.tier === "beef" ? "🥩" : "⭐"}
                      </span>
                    )}
                  </div>
                </div>

                <select
                  value={topping.amount}
                  onChange={(e) =>
                    onToppingChange(topping.id, e.target.value as ToppingAmount)
                  }
                  className="w-full text-gray-900 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">None</option>
                  <option value="light">Light</option>
                  <option value="normal">Normal</option>
                  <option value="extra">Extra</option>
                  <option value="xxtra">XXtra</option>
                </select>

                {/* Show pricing with template logic */}
                {topping.isActive && (
                  <div className="text-sm font-semibold mt-2">
                    {topping.isSpecialtyDefault &&
                    topping.calculatedPrice === 0 ? (
                      <span className="text-purple-600">INCLUDED</span>
                    ) : topping.calculatedPrice > 0 ? (
                      <span className="text-green-600">
                        +${topping.calculatedPrice.toFixed(2)}
                      </span>
                    ) : null}
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

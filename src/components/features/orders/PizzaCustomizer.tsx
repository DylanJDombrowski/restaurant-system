// src/components/features/orders/PizzaCustomizer.tsx - FINAL FIX
"use client";
import {
  getCrustDisplayName,
  ToppingPlacement,
  type ConfiguredCartItem,
  type CrustPricing,
  type Customization,
  type PizzaMenuResponse,
  type PizzaPriceCalculationResponse,
  type ToppingAmount,
} from "@/lib/types";
import { isStuffedPizza } from "@/lib/utils/pizza-utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PizzaCrustSelector } from "./customizers/PizzaCrustSelector";
import { PizzaSizeSelector } from "./customizers/PizzaSizeSelector";
import { PricingDisplay } from "./customizers/PricingDisplay";
import { SpecialInstructions } from "./customizers/SpecialInstructions";
import { ToppingSelector } from "./customizers/ToppingSelector";

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
  placement: ToppingPlacement;
}

interface CrustOption {
  sizeCode: string;
  crustType: string;
  basePrice: number;
  upcharge: number;
  displayName: string;
  isAvailable: boolean;
}

interface EnhancedPizzaCustomizerProps {
  item: ConfiguredCartItem;
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

// UTILITY FUNCTIONS
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
    defaultOpen: false,
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
    defaultOpen: false,
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
      "extra",
    ],
    defaultOpen: false,
  },
  sauces: {
    displayName: "Sauces",
    icon: "🍅",
    keywords: ["alfredo", "bbq", "garlic butter", "sauce", "no sauce"],
    defaultOpen: false,
  },
} as const;

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

  // UI states
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Cache refs
  const lastPricingRequest = useRef<string | null>(null);
  const pricingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  //
  // ⬇️ MODIFICATION 1: Get available sizes from the specific item's variants ⬇️
  //
  const availableSizesForCurrentItem = useMemo(() => {
    if (!pizzaMenuData) return [];

    const currentItemDetails = pizzaMenuData.pizza_items.find(
      (p) => p.id === item.menuItemId
    );
    if (!currentItemDetails) {
      console.warn(`Could not find details for menu item ${item.menuItemId}`);
      return [];
    }

    // Get the unique size codes from the item's variants
    const sizes = currentItemDetails.variants.map((v) => v.size_code);
    return [...new Set(sizes)]; // e.g., ['small', 'medium', 'large'] for stuffed pizzas
  }, [pizzaMenuData, item.menuItemId]);
  //
  // ⬆️ END MODIFICATION 1 ⬆️
  //

  // MEMOIZED VALUES
  const activeToppings = useMemo(
    () =>
      toppings
        .filter((t) => t.amount !== "none")
        .map((t) => ({
          customization_id: t.id,
          amount: t.amount,
          placement: t.placement,
        })),
    [toppings]
  );

  const pricingRequestKey = useMemo(() => {
    if (!selectedCrust) return null;
    const key = JSON.stringify({
      menuItemId: item.menuItemId,
      size: selectedCrust.sizeCode,
      crust: selectedCrust.crustType,
      toppings: activeToppings,
    });
    return key;
  }, [selectedCrust, activeToppings, item.menuItemId]);

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
        const { category: displayCategory, icon } =
          getDisplayCategory(customization);

        let defaultAmount: ToppingAmount = "none";
        let isSpecialtyDefault = false;

        if (templateTopping) {
          defaultAmount = templateTopping.default_amount as ToppingAmount;
          isSpecialtyDefault = true;
        }

        const isActive = defaultAmount !== "none";

        toppingConfigs.push({
          id: customization.id,
          name: customization.name,
          category: customization.category,
          displayCategory,
          amount: defaultAmount,
          basePrice: customization.base_price,
          calculatedPrice: 0,
          isActive,
          isSpecialtyDefault,
          tier: getTierFromCategory(customization.category),
          icon,
          placement: "whole",
        });
      });

      // Sort: specialty defaults first, then by name
      toppingConfigs.sort((a, b) => {
        if (a.isSpecialtyDefault && !b.isSpecialtyDefault) return -1;
        if (!a.isSpecialtyDefault && b.isSpecialtyDefault) return 1;
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
    [item.menuItemId]
  );

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

      //
      // ⬇️ MODIFICATION 2: Use specific variants to determine available sizes ⬇️
      //
      // Use the specific variants of the current item to determine available sizes
      const currentItemDetails = result.data.pizza_items.find(
        (p: { id: string }) => p.id === item.menuItemId
      );

      // Explicitly filter out any null/undefined sizes and ensure we have an array of strings.
      const specificAvailableSizes: string[] = currentItemDetails
        ? [
            ...new Set(
              currentItemDetails.variants
                .map((v: { size_code: string | null }) => v.size_code)
                .filter(Boolean) as string[]
            ),
          ]
        : [];

      // Use a clearer if/else block to determine the default size.
      let defaultSize = ""; // Default to an empty string
      if (specificAvailableSizes.includes("medium")) {
        defaultSize = "medium";
      } else if (specificAvailableSizes.length > 0) {
        defaultSize = specificAvailableSizes[0];
      }

      if (defaultSize) {
        setSelectedSize(defaultSize);
        autoSelectDefaultCrust(defaultSize, result.data);
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
  }, [restaurantId, initializeToppingsWithTemplates, item.menuItemId]); // Added item.menuItemId dependency

  const autoSelectDefaultCrust = (
    sizeCode: string,
    menuData: PizzaMenuResponse
  ) => {
    const thinCrustForSize = menuData.crust_pricing.find((cp: CrustPricing) => {
      const matchesSize =
        cp.size_code === sizeCode ||
        (sizeCode === "medium" && cp.size_code === "12in") ||
        (sizeCode === "small" && cp.size_code === "10in") ||
        (sizeCode === "large" && cp.size_code === "14in") ||
        (sizeCode === "xlarge" && cp.size_code === "16in");

      return matchesSize && cp.crust_type === "thin";
    });

    if (thinCrustForSize) {
      const defaultCrust: CrustOption = {
        sizeCode: sizeCode,
        crustType: thinCrustForSize.crust_type,
        basePrice: thinCrustForSize.base_price,
        upcharge: thinCrustForSize.upcharge,
        displayName: getCrustDisplayName(thinCrustForSize.crust_type),
        isAvailable: true,
      };
      setSelectedCrust(defaultCrust);
    }
  };

  // PRICING CALCULATION
  const calculatePrice = useCallback(async () => {
    if (!selectedCrust || !pizzaMenuData || !pricingRequestKey) return;

    const isStuffed = isStuffedPizza(item.menuItemName);

    if (isStuffed) {
      // For stuffed pizzas, use variant pricing directly
      const currentMenuItem = pizzaMenuData.pizza_items.find(
        (i) => i.id === item.menuItemId
      );
      const variant = currentMenuItem?.variants.find(
        (v) =>
          v.size_code === selectedCrust.sizeCode && v.crust_type === "stuffed"
      );

      if (variant) {
        // Build pricing response for stuffed pizza
        const stuffedPricing: PizzaPriceCalculationResponse = {
          basePrice: variant.price,
          basePriceSource: "specialty",
          crustUpcharge: 0,
          toppingCost: 0, // Calculate separately if there are toppings
          substitutionCredit: 0,
          finalPrice: variant.price, // + topping costs
          breakdown: [
            {
              name: `${getSizeDisplayName(
                selectedCrust.sizeCode
              )} Deep Dish Base`,
              price: variant.price,
              type: "specialty_base",
            },
          ],
          sizeCode: selectedCrust.sizeCode,
          crustType: selectedCrust.crustType,
          estimatedPrepTime: 25, // Stuffed pizzas take longer
        };

        setCurrentPricing(stuffedPricing);
        return;
      }
    }

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

      // Update topping prices from breakdown
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
    pizzaMenuData,
    pricingRequestKey,
    item.menuItemName,
    item.menuItemId,
    toppings,
    restaurantId,
  ]);

  // DEBOUNCED PRICING CALCULATION
  useEffect(() => {
    if (pricingRequestKey && !isLoading) {
      if (pricingTimeoutRef.current) {
        clearTimeout(pricingTimeoutRef.current);
      }

      pricingTimeoutRef.current = setTimeout(() => {
        calculatePrice();
      }, 500);

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

    if (pizzaMenuData) {
      autoSelectDefaultCrust(sizeCode, pizzaMenuData);
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

  const handleToppingPlacementChange = (
    toppingId: string,
    placement: ToppingPlacement
  ) => {
    console.log(`🍕 Changing topping ${toppingId} placement to`, placement);
    setToppings((prev) =>
      prev.map((topping) =>
        topping.id === toppingId ? { ...topping, placement } : topping
      )
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
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

  const finalPrice =
    currentPricing?.finalPrice || selectedCrust?.basePrice || 0;
  const canSave = selectedCrust && !isCalculatingPrice;

  // RENDER
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
                <span className="text-gray-500">Calculating...</span>
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
              <PizzaSizeSelector
                //
                // ⬇️ MODIFICATION 3: Use item-specific available sizes ⬇️
                //
                availableSizes={availableSizesForCurrentItem} // Use our new derived list
                //
                // ⬆️ END MODIFICATION 3 ⬆️
                //
                selectedSize={selectedSize}
                onSizeSelect={handleSizeSelect}
                pizzaMenuData={pizzaMenuData}
                menuItemId={item.menuItemId}
                isLoading={isLoading}
              />

              {/* Crust Selection */}
              {selectedSize && (
                <PizzaCrustSelector
                  selectedSize={selectedSize}
                  selectedCrust={selectedCrust}
                  onCrustSelect={handleCrustSelect}
                  pizzaMenuData={pizzaMenuData}
                  item={item}
                  isLoading={isLoading}
                />
              )}

              {selectedCrust && (
                <ToppingSelector
                  toppings={toppings}
                  onToppingChange={handleToppingChange}
                  onToppingPlacementChange={handleToppingPlacementChange}
                  expandedCategories={expandedCategories}
                  onToggleCategory={toggleCategory}
                  selectedSize={selectedCrust.sizeCode}
                  showPlacements={true}
                />
              )}

              {selectedCrust && (
                <PricingDisplay
                  currentPricing={currentPricing}
                  isCalculating={isCalculatingPrice}
                  pricingError={pricingError}
                  selectedSize={getSizeDisplayName(selectedCrust.sizeCode)}
                  selectedCrust={selectedCrust.displayName}
                />
              )}

              {/* Special Instructions */}
              {selectedCrust && (
                <SpecialInstructions
                  instructions={specialInstructions}
                  onChange={setSpecialInstructions}
                  placeholder="Any special requests for this pizza..."
                  maxLength={500}
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
              <div className="text-sm text-gray-500">Total:</div>
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

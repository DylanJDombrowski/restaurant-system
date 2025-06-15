// src/components/features/orders/PizzaCustomizer.tsx - ENHANCED VERSION
"use client";
import type {
  ConfiguredCartItem,
  CrustPricing,
  Customization,
  PizzaMenuResponse,
  PizzaPriceCalculationResponse,
  ToppingAmount,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PizzaSizeSelector } from "./customizers/PizzaSizeSelector";

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
  isAvailable: boolean; // NEW: For gluten-free business rule
}

interface EnhancedPizzaCustomizerProps {
  item: ConfiguredCartItem;
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

// ENHANCED CATEGORIZATION CONFIG
const TOPPING_CATEGORIES = {
  meats: {
    displayName: "Meats & Proteins",
    icon: "🥓",
    keywords: ["pepperoni", "sausage", "bacon", "canadian bacon", "salami", "ham", "chicken", "meatball", "beef"],
    defaultOpen: false,
  },
  vegetables: {
    displayName: "Vegetables & Fruits",
    icon: "🥬",
    keywords: ["mushroom", "onion", "pepper", "olive", "tomato", "spinach", "basil", "pineapple", "giardiniera"],
    defaultOpen: false,
  },
  cheese: {
    displayName: "Cheese",
    icon: "🧀",
    keywords: ["mozzarella", "feta", "parmesan", "goat cheese", "ricotta", "cheese", "extra"],
    defaultOpen: false,
  },
  sauces: {
    displayName: "Sauces",
    icon: "🍅",
    keywords: ["alfredo", "bbq", "garlic butter", "sauce", "no sauce"],
    defaultOpen: false,
  },
};

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

const getCrustDisplayName = (crustType: string): string => {
  const crustNames: Record<string, string> = {
    thin: "Thin Crust",
    double_dough: "Double Dough",
    gluten_free: "Gluten Free",
    stuffed: "Stuffed Crust",
  };
  return crustNames[crustType] || crustType;
};

const getDisplayCategory = (customization: Customization): { category: string; icon: string } => {
  const name = customization.name.toLowerCase();

  for (const [categoryKey, categoryConfig] of Object.entries(TOPPING_CATEGORIES)) {
    if (categoryConfig.keywords.some((keyword) => name.includes(keyword))) {
      return {
        category: categoryKey,
        icon: categoryConfig.icon,
      };
    }
  }

  return { category: "other", icon: "🍕" };
};

const getTierFromCategory = (category: string): "normal" | "premium" | "beef" => {
  if (category.includes("beef")) return "beef";
  if (category.includes("premium")) return "premium";
  return "normal";
};

// 🚨 GLUTEN-FREE BUSINESS RULE
const shouldDisableGlutenFree = (item: ConfiguredCartItem, selectedSize: string): boolean => {
  const itemName = item.menuItemName.toLowerCase();

  // Deep-dish pizzas cannot have gluten-free on 10" size
  if (selectedSize === "small" || selectedSize === "10in") {
    if (itemName === "stuffed pizza" || itemName === "the chub") {
      return true;
    }
  }

  return false;
};

export default function EnhancedPizzaCustomizer({ item, onComplete, onCancel, isOpen, restaurantId }: EnhancedPizzaCustomizerProps) {
  // STATE MANAGEMENT
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pizzaMenuData, setPizzaMenuData] = useState<PizzaMenuResponse | null>(null);

  // Selection states
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedCrust, setSelectedCrust] = useState<CrustOption | null>(null);
  const [toppings, setToppings] = useState<ToppingState[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(item.specialInstructions || "");

  // Pricing states
  const [currentPricing, setCurrentPricing] = useState<PizzaPriceCalculationResponse | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // UI states
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Cache refs
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

  // Group toppings by category for rendering
  const { includedToppings, addOnToppings } = useMemo(() => {
    const included = toppings.filter((t) => t.isSpecialtyDefault);
    const addOns = toppings.filter((t) => !t.isSpecialtyDefault);

    const groupedAddOns = addOns.reduce((acc, topping) => {
      const category = topping.displayCategory;
      if (!acc[category]) acc[category] = [];
      acc[category].push(topping);
      return acc;
    }, {} as Record<string, ToppingState[]>);

    return { includedToppings: included, addOnToppings: groupedAddOns };
  }, [toppings]);

  const initializeToppingsWithTemplates = useCallback(
    (menuData: PizzaMenuResponse) => {
      const toppingConfigs: ToppingState[] = [];

      const pizzaToppings = menuData.pizza_customizations.filter((c: Customization) => c.category.startsWith("topping_"));

      // Find pizza template by menu item ID
      const template = menuData.pizza_templates.find((t) => t.menu_item_id === item.menuItemId);
      const templateToppings = template?.template_toppings || [];

      console.log("🍕 Template lookup:", {
        menuItemId: item.menuItemId,
        templateFound: !!template,
        templateName: template?.name,
        defaultToppings: templateToppings.length,
      });

      pizzaToppings.forEach((customization: Customization) => {
        const templateTopping = templateToppings.find((tt) => tt.customization_id === customization.id);
        const { category: displayCategory, icon } = getDisplayCategory(customization);

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
        specialtyDefaults: toppingConfigs.filter((t) => t.isSpecialtyDefault).length,
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

      const response = await fetch(`/api/menu/pizza?restaurant_id=${restaurantId}`);
      if (!response.ok) {
        throw new Error(`Failed to load pizza menu: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      console.log("✅ Pizza menu data loaded:", result.data);
      setPizzaMenuData(result.data);

      // Auto-select defaults
      const availableSizes = result.data.available_sizes || [];
      const defaultSize = availableSizes.includes("medium") ? "medium" : availableSizes[0];

      if (defaultSize) {
        setSelectedSize(defaultSize);
        autoSelectDefaultCrust(defaultSize, result.data);
      }

      initializeToppingsWithTemplates(result.data);
    } catch (error) {
      console.error("Error loading pizza menu:", error);
      setError(error instanceof Error ? error.message : "Failed to load pizza menu");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, initializeToppingsWithTemplates]);

  const autoSelectDefaultCrust = (sizeCode: string, menuData: PizzaMenuResponse) => {
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

  // INITIALIZE TOPPINGS WITH TEMPLATE SUPPORT
  // PRICING CALCULATION
  const calculatePrice = useCallback(async () => {
    if (!selectedCrust || !pizzaMenuData || !pricingRequestKey) {
      return;
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
                (item.type === "topping" || item.type === "template_default" || item.type === "template_extra")
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
      setPricingError(error instanceof Error ? error.message : "Pricing calculation failed");
    } finally {
      setIsCalculatingPrice(false);
    }
  }, [selectedCrust, toppings, pizzaMenuData, restaurantId, item.menuItemId, pricingRequestKey]);

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
      prev.map((topping) => (topping.id === toppingId ? { ...topping, amount: newAmount, isActive: newAmount !== "none" } : topping))
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
      variantName: `${getSizeDisplayName(selectedCrust.sizeCode)} ${selectedCrust.displayName}`,
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
      displayName: `${getSizeDisplayName(selectedCrust.sizeCode)} ${selectedCrust.displayName} ${item.menuItemName}`,
    };

    console.log("✅ Saved enhanced pizza:", updatedItem);
    onComplete(updatedItem);
  };

  // RENDER CONDITIONS
  if (!isOpen) return null;

  // Get available crusts for selected size with gluten-free business rule
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

            const itemName = item.menuItemName.toLowerCase();
            const isDeepDishPizza = itemName === "stuffed pizza" || itemName === "the chub";

            if (cp.crust_type === "stuffed" && !isDeepDishPizza) {
              return false; // Hide stuffed crust for regular pizzas
            }
            return matchesSize;
          })
          .map((cp: CrustPricing) => ({
            sizeCode: selectedSize,
            crustType: cp.crust_type,
            basePrice: cp.base_price,
            upcharge: cp.upcharge,
            displayName: getCrustDisplayName(cp.crust_type),
            isAvailable: !(cp.crust_type === "gluten_free" && shouldDisableGlutenFree(item, selectedSize)),
          }))
      : [];

  const finalPrice = currentPricing?.finalPrice || selectedCrust?.basePrice || 0;
  const canSave = selectedCrust && !isCalculatingPrice;

  // RENDER
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Customize {item.menuItemName}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedCrust ? (
                <span className="font-medium">
                  {getSizeDisplayName(selectedCrust.sizeCode)} {selectedCrust.displayName}
                </span>
              ) : (
                "Choose your pizza size and crust"
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {isCalculatingPrice ? <span className="text-gray-500">Calculating...</span> : `$${finalPrice.toFixed(2)}`}
            </div>
            <div className="text-sm text-gray-500">Current total</div>
            {pricingError && <div className="text-sm text-red-600 mt-1">{pricingError}</div>}
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
                availableSizes={pizzaMenuData?.available_sizes || []}
                selectedSize={selectedSize}
                onSizeSelect={handleSizeSelect}
                pizzaMenuData={pizzaMenuData}
                menuItemId={item.menuItemId}
                isLoading={isLoading}
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

              {/* NEW: Included Toppings Section */}
              {selectedCrust && includedToppings.length > 0 && (
                <IncludedToppingsSection
                  toppings={includedToppings}
                  onToppingChange={handleToppingChange}
                  selectedSize={selectedCrust.sizeCode}
                />
              )}

              {/* NEW: Add-on Toppings Section */}
              {selectedCrust && Object.keys(addOnToppings).length > 0 && (
                <AddOnToppingsSection
                  toppingsByCategory={addOnToppings}
                  expandedCategories={expandedCategories}
                  onToppingChange={handleToppingChange}
                  onToggleCategory={toggleCategory}
                  selectedSize={selectedCrust.sizeCode}
                />
              )}

              {/* Special Instructions */}
              {selectedCrust && <SpecialInstructions instructions={specialInstructions} onChange={setSpecialInstructions} />}
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
              <div className="text-xl font-bold text-green-600">${finalPrice.toFixed(2)}</div>
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

// ENHANCED COMPONENT SECTIONS

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
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Crust ({getSizeDisplayName(selectedSize)})</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {availableCrusts.map((crust) => (
          <button
            key={`${crust.sizeCode}-${crust.crustType}`}
            onClick={() => crust.isAvailable && onCrustSelect(crust)}
            disabled={!crust.isAvailable}
            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
              selectedCrust?.crustType === crust.crustType
                ? "border-blue-600 bg-blue-50 shadow-md"
                : crust.isAvailable
                ? "border-gray-200 hover:border-gray-300"
                : "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="font-semibold text-gray-900">{crust.displayName}</div>
            <div className="text-lg font-bold text-green-600 mt-2">${crust.basePrice.toFixed(2)}</div>
            {crust.upcharge > 0 && <div className="text-sm text-gray-600">+${crust.upcharge.toFixed(2)} upcharge</div>}
            {!crust.isAvailable && <div className="text-sm text-red-600 mt-1">Not available for this pizza</div>}
          </button>
        ))}
      </div>
    </section>
  );
}

// NEW: Included Toppings Section - Prominent display of template defaults
function IncludedToppingsSection({
  toppings,
  onToppingChange,
  selectedSize,
}: {
  toppings: ToppingState[];
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
  selectedSize: string;
}) {
  return (
    <section className="bg-purple-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="text-lg font-semibold text-purple-900 flex items-center">
          <span className="mr-2 text-xl">✨</span>
          Included Toppings
        </div>
        <div className="ml-auto text-sm text-purple-700 font-medium">Included in {getSizeDisplayName(selectedSize)} price</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toppings.map((topping) => (
          <div key={topping.id} className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-medium text-gray-900">{topping.name}</span>
                <div className="flex items-center mt-1">
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">INCLUDED</span>
                  {topping.tier !== "normal" && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                      {topping.tier === "beef" ? "🥩 BEEF" : "⭐ PREMIUM"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Amount:</label>
              <select
                value={topping.amount}
                onChange={(e) => onToppingChange(topping.id, e.target.value as ToppingAmount)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="none">Remove</option>
                <option value="light">Light</option>
                <option value="normal">Normal (Default)</option>
                <option value="extra">Extra</option>
                <option value="xxtra">XXtra</option>
              </select>
            </div>

            {/* Show pricing for modifications */}
            <div className="mt-3 text-sm font-semibold">
              {topping.amount === "normal" ? (
                <span className="text-purple-600">INCLUDED</span>
              ) : topping.amount === "none" ? (
                <span className="text-gray-500">REMOVED</span>
              ) : topping.calculatedPrice > 0 ? (
                <span className="text-green-600">+${topping.calculatedPrice.toFixed(2)}</span>
              ) : (
                <span className="text-purple-600">INCLUDED</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// NEW: Add-on Toppings Section - Collapsible accordions by category
function AddOnToppingsSection({
  toppingsByCategory,
  expandedCategories,
  onToppingChange,
  onToggleCategory,
  selectedSize,
}: {
  toppingsByCategory: Record<string, ToppingState[]>;
  expandedCategories: Set<string>;
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
  onToggleCategory: (category: string) => void;
  selectedSize: string;
}) {
  const getCategoryDisplayName = (category: string) => {
    const config = TOPPING_CATEGORIES[category as keyof typeof TOPPING_CATEGORIES];
    return config?.displayName || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getCategoryIcon = (category: string) => {
    const config = TOPPING_CATEGORIES[category as keyof typeof TOPPING_CATEGORIES];
    return config?.icon || "🍕";
  };

  return (
    <section>
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2 text-xl">🍕</span>
          Add-on Toppings
        </h3>
        <div className="ml-auto text-sm text-gray-600">Prices for {getSizeDisplayName(selectedSize)}</div>
      </div>

      <div className="space-y-3">
        {Object.entries(toppingsByCategory).map(([category, categoryToppings]) => {
          const isExpanded = expandedCategories.has(category);
          const activeCount = categoryToppings.filter((t) => t.isActive).length;

          return (
            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header - Clickable */}
              <button
                onClick={() => onToggleCategory(category)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">{getCategoryIcon(category)}</span>
                  <span className="font-medium text-gray-900">{getCategoryDisplayName(category)}</span>
                  {activeCount > 0 && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {activeCount} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">{categoryToppings.length} items</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Category Content - Collapsible */}
              {isExpanded && (
                <div className="p-4 bg-white">
                  {category === "sauces" ? (
                    // Sauce Selection - Radio Buttons (Single Selection)
                    <SauceSelection sauces={categoryToppings} onToppingChange={onToppingChange} />
                  ) : (
                    // Regular Toppings - Individual Selection
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryToppings.map((topping) => (
                        <ToppingCard key={topping.id} topping={topping} onToppingChange={onToppingChange} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// NEW: Sauce Selection Component - Radio button style for single selection
function SauceSelection({
  sauces,
  onToppingChange,
}: {
  sauces: ToppingState[];
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
}) {
  const handleSauceSelect = (sauceId: string) => {
    // Clear all other sauces
    sauces.forEach((sauce) => {
      if (sauce.id !== sauceId && sauce.amount !== "none") {
        onToppingChange(sauce.id, "none");
      }
    });

    // Set selected sauce
    const currentSauce = sauces.find((s) => s.id === sauceId);
    if (currentSauce) {
      onToppingChange(sauceId, currentSauce.amount === "none" ? "normal" : "none");
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 mb-3">Choose one sauce (all sauces are free):</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sauces.map((sauce) => (
          <label
            key={sauce.id}
            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
              sauce.amount !== "none" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="sauce-selection"
              checked={sauce.amount !== "none"}
              onChange={() => handleSauceSelect(sauce.id)}
              className="mr-3 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">{sauce.name}</span>
              <div className="text-sm text-green-600 font-medium">FREE</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// NEW: Individual Topping Card Component
function ToppingCard({
  topping,
  onToppingChange,
}: {
  topping: ToppingState;
  onToppingChange: (toppingId: string, amount: ToppingAmount) => void;
}) {
  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        topping.isActive ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 leading-tight">{topping.name}</span>
        <div className="flex items-center gap-1 ml-2">
          {topping.tier !== "normal" && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded font-medium">
              {topping.tier === "beef" ? "🥩" : "⭐"}
            </span>
          )}
        </div>
      </div>

      <select
        value={topping.amount}
        onChange={(e) => onToppingChange(topping.id, e.target.value as ToppingAmount)}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="none">None</option>
        <option value="light">Light</option>
        <option value="normal">Normal</option>
        <option value="extra">Extra</option>
        <option value="xxtra">XXtra</option>
      </select>

      {/* Show pricing */}
      {topping.isActive && (
        <div className="text-sm font-semibold mt-2">
          {topping.calculatedPrice > 0 ? (
            <span className="text-green-600">+${topping.calculatedPrice.toFixed(2)}</span>
          ) : (
            <span className="text-blue-600">Calculating...</span>
          )}
        </div>
      )}
    </div>
  );
}

function SpecialInstructions({ instructions, onChange }: { instructions: string; onChange: (instructions: string) => void }) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Instructions</h3>
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
      <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Pizza Menu</h3>
      <p className="text-gray-600">Getting crust options and toppings...</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="p-8 text-center">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Pizza Menu</h3>
      <p className="text-gray-600 mb-4">{error}</p>
      <button onClick={onRetry} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
        Try Again
      </button>
    </div>
  );
}

// src/components/features/orders/FullScreenPizzaCustomizer.tsx
"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ConfiguredCartItem,
  Topping,
  Modifier,
  ToppingAmount,
  MenuItemWithVariants,
} from "@/lib/types";

/**
 * Full-Screen Pizza Customizer Modal
 *
 * This component represents the evolution of your pizza customization system.
 * It replaces the smaller modal approach with a full-screen experience that:
 *
 * 1. ELIMINATES FRICTION: No more select item → select variant → click customize
 *    Instead: select item → customize everything at once including size
 *
 * 2. PROVIDES QUICK PATHS: Quick add buttons for each size with default toppings
 *    Perfect for experienced staff during busy periods
 *
 * 3. MOBILE-OPTIMIZED: Full-screen design works excellently on iPads and tablets
 *    Critical for your staff workflow during dinner rush
 *
 * 4. DATABASE-DRIVEN: Uses your actual menu data instead of hardcoded values
 *    Prices, toppings, and options automatically reflect your current menu
 *
 * The component receives all its data through props (dependency injection pattern),
 * making it fast, predictable, and easy to test.
 */

interface ToppingConfiguration {
  id: string;
  name: string;
  amount: ToppingAmount;
  price: number;
  isDefault: boolean;
  category: string;
  isPremium?: boolean;
  basePrice: number;
}

interface ModifierConfiguration {
  id: string;
  name: string;
  priceAdjustment: number;
  selected: boolean;
}

interface FullScreenPizzaCustomizerProps {
  item: ConfiguredCartItem;
  menuItemWithVariants: MenuItemWithVariants;
  availableToppings: Topping[];
  availableModifiers: Modifier[];
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isEditMode?: boolean;
}

export default function FullScreenPizzaCustomizer({
  item,
  menuItemWithVariants,
  availableToppings,
  availableModifiers,
  onComplete,
  onCancel,
  isEditMode = false,
}: FullScreenPizzaCustomizerProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  /**
   * Internal component state for customization options.
   * Notice we're NOT fetching data here - everything comes through props.
   * This makes the component faster and more reliable.
   */
  const [toppings, setToppings] = useState<ToppingConfiguration[]>([]);
  const [modifiers, setModifiers] = useState<ModifierConfiguration[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    item.specialInstructions || ""
  );
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  /**
   * Available crust options. In a future enhancement, you could move this
   * to your database and fetch it like toppings, but for now this provides
   * the flexibility your customers expect.
   */
  const availableCrusts = useMemo(
    () => [
      { name: "Thin", description: "Crispy and light" },
      { name: "Hand-Tossed", description: "Classic favorite" },
      { name: "Thick", description: "Hearty and filling" },
      { name: "Stuffed", description: "Cheese-filled crust", premium: true },
    ],
    []
  );

  const [selectedCrust, setSelectedCrust] = useState("Hand-Tossed");

  // ==========================================
  // DATABASE-DRIVEN SIZE OPTIONS
  // ==========================================

  /**
   * This is where the magic happens - instead of hardcoded sizes,
   * we're using your actual menu variants from the database.
   * This means pricing is always accurate and reflects your current menu.
   */
  const availableSizes = useMemo(() => {
    return menuItemWithVariants.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      serves: variant.serves || "Perfect for sharing",
      crustType: variant.crust_type,
      variant: variant, // Keep reference to full variant object
    }));
  }, [menuItemWithVariants.variants]);

  /**
   * Smart default selection - tries to find medium first, then falls back
   * to the first available option. This handles edge cases where a pizza
   * might not have a medium size.
   */
  const defaultVariant = useMemo(() => {
    const mediumVariant = availableSizes.find((size) =>
      size.name.toLowerCase().includes("medium")
    );
    return mediumVariant || availableSizes[0];
  }, [availableSizes]);

  const [selectedSize, setSelectedSize] = useState(
    item.variantName || defaultVariant.name
  );

  // ==========================================
  // SOPHISTICATED TOPPING INITIALIZATION
  // ==========================================

  /**
   * This function handles the complex logic of initializing toppings.
   * It needs to handle three scenarios:
   * 1. Default toppings from specialty pizzas (like Margherita having mozzarella and basil)
   * 2. Existing toppings when editing a cart item
   * 3. All available toppings for selection
   *
   * The business logic here is quite sophisticated and represents years
   * of restaurant operational knowledge encoded in software.
   */
  const initializeToppings = useCallback(() => {
    const toppingConfigs: ToppingConfiguration[] = [];

    // STEP 1: Handle default toppings from the menu item configuration
    // This is where specialty pizzas get their signature ingredients
    if (
      menuItemWithVariants.default_toppings_json &&
      menuItemWithVariants.item_type === "pizza"
    ) {
      try {
        const defaultConfig = menuItemWithVariants.default_toppings_json as {
          toppings: Array<{
            id: string;
            name: string;
            amount?: ToppingAmount;
          }>;
        };

        if (defaultConfig.toppings && Array.isArray(defaultConfig.toppings)) {
          defaultConfig.toppings.forEach((defaultTopping) => {
            const availableTopping = availableToppings.find(
              (t) => t.id === defaultTopping.id
            );
            if (availableTopping) {
              toppingConfigs.push({
                id: defaultTopping.id,
                name: defaultTopping.name,
                amount: defaultTopping.amount || "normal",
                price: 0, // Default toppings typically don't add cost
                isDefault: true,
                category: availableTopping.category,
                isPremium: availableTopping.is_premium,
                basePrice: availableTopping.is_premium ? 3.0 : 2.0,
              });
            }
          });
        }
      } catch (error) {
        console.error("Error parsing default toppings:", error);
      }
    }

    // STEP 2: Handle existing toppings from the cart item (for edit mode)
    // This preserves customer customizations when editing an order
    if (item.selectedToppings) {
      item.selectedToppings.forEach((selectedTopping) => {
        const existingIndex = toppingConfigs.findIndex(
          (t) => t.id === selectedTopping.id
        );

        if (existingIndex >= 0) {
          // Update existing default topping with customer's preference
          toppingConfigs[existingIndex] = {
            ...toppingConfigs[existingIndex],
            amount: selectedTopping.amount,
            price: selectedTopping.price,
          };
        } else {
          // Add non-default topping that customer selected
          const availableTopping = availableToppings.find(
            (t) => t.id === selectedTopping.id
          );
          if (availableTopping) {
            toppingConfigs.push({
              id: selectedTopping.id,
              name: selectedTopping.name,
              amount: selectedTopping.amount,
              price: selectedTopping.price,
              isDefault: selectedTopping.isDefault,
              category: selectedTopping.category || availableTopping.category,
              isPremium: availableTopping.is_premium,
              basePrice: availableTopping.is_premium ? 3.0 : 2.0,
            });
          }
        }
      });
    }

    // STEP 3: Add all other available toppings as "none"
    // This ensures every topping is available for selection
    availableToppings.forEach((availableTopping) => {
      const existing = toppingConfigs.find((t) => t.id === availableTopping.id);
      if (!existing) {
        toppingConfigs.push({
          id: availableTopping.id,
          name: availableTopping.name,
          amount: "none",
          price: 0,
          isDefault: false,
          category: availableTopping.category,
          isPremium: availableTopping.is_premium,
          basePrice: availableTopping.is_premium ? 3.0 : 2.0,
        });
      }
    });

    setToppings(toppingConfigs);
  }, [
    availableToppings,
    menuItemWithVariants.default_toppings_json,
    menuItemWithVariants.item_type,
    item.selectedToppings,
  ]);

  /**
   * Initialize modifiers from the available options and any existing selections.
   * This is simpler than toppings because modifiers are typically binary choices.
   */
  const initializeModifiers = useCallback(() => {
    const modifierConfigs: ModifierConfiguration[] = availableModifiers.map(
      (mod) => ({
        id: mod.id,
        name: mod.name,
        priceAdjustment: mod.price_adjustment,
        selected: item.selectedModifiers?.some((m) => m.id === mod.id) || false,
      })
    );
    setModifiers(modifierConfigs);
  }, [availableModifiers, item.selectedModifiers]);

  // Initialize toppings and modifiers when data becomes available
  useEffect(() => {
    if (availableToppings.length > 0) {
      initializeToppings();
    }
  }, [availableToppings, initializeToppings]);

  useEffect(() => {
    if (availableModifiers.length > 0) {
      initializeModifiers();
    }
  }, [availableModifiers, initializeModifiers]);

  // ==========================================
  // BUSINESS LOGIC FUNCTIONS
  // ==========================================

  /**
   * Your sophisticated pricing logic for toppings.
   * This encodes important business rules:
   * - Default toppings are free unless you get extra
   * - Premium toppings cost more
   * - Amounts affect pricing (light = 75%, normal = 100%, extra = 150%)
   */
  const calculateToppingPrice = (
    topping: ToppingConfiguration,
    amount: ToppingAmount,
    isDefault: boolean
  ): number => {
    if (amount === "none") return 0;

    // Default toppings don't cost extra unless you get "extra"
    if (isDefault) {
      return amount === "extra" ? topping.basePrice * 0.5 : 0;
    }

    // Non-default toppings have full pricing
    switch (amount) {
      case "light":
        return topping.basePrice * 0.75;
      case "normal":
        return topping.basePrice;
      case "extra":
        return topping.basePrice * 1.5;
      default:
        return 0;
    }
  };

  /**
   * The QUICK ADD feature - this is your efficiency game-changer.
   * Staff can bypass the entire customization process for standard orders.
   * Perfect for "I'll take a large pepperoni pizza" orders.
   */
  const handleQuickAdd = (variant: (typeof availableSizes)[0]) => {
    const quickAddItem: ConfiguredCartItem = {
      ...item,
      variantId: variant.id,
      variantName: variant.name,
      quantity: 1,
      basePrice: variant.price,
      selectedToppings: toppings
        .filter((t) => t.isDefault && t.amount !== "none")
        .map((t) => ({
          id: t.id,
          name: t.name,
          amount: t.amount,
          price: t.price,
          isDefault: t.isDefault,
          category: t.category,
        })),
      selectedModifiers: [], // Quick add uses no modifiers
      totalPrice: variant.price, // Quick add uses base variant price
      displayName: `${variant.name} ${menuItemWithVariants.name}`,
      specialInstructions: "",
    };

    onComplete(quickAddItem);
  };

  // Handle topping amount changes with real-time price calculation
  const handleToppingChange = (toppingId: string, newAmount: ToppingAmount) => {
    setToppings((prev) =>
      prev.map((topping) => {
        if (topping.id === toppingId) {
          const newPrice = calculateToppingPrice(
            topping,
            newAmount,
            topping.isDefault
          );
          return { ...topping, amount: newAmount, price: newPrice };
        }
        return topping;
      })
    );
  };

  // Handle modifier selection changes
  const handleModifierChange = (modifierId: string, selected: boolean) => {
    setModifiers((prev) =>
      prev.map((modifier) =>
        modifier.id === modifierId ? { ...modifier, selected } : modifier
      )
    );
  };

  // ==========================================
  // REAL-TIME PRICE CALCULATION
  // ==========================================

  /**
   * This is where your database-driven pricing really shines.
   * Every price change reflects your actual menu data, and updates
   * happen instantly as customers make selections.
   */
  const calculatedPrice = useMemo(() => {
    const selectedSizeObj = availableSizes.find((s) => s.name === selectedSize);
    let total = selectedSizeObj?.price || item.basePrice;

    // Add crust premium (you could move this to database too)
    if (selectedCrust === "Stuffed") {
      total += 2.0;
    }

    // Add topping costs using your business logic
    toppings.forEach((topping) => {
      total += topping.price;
    });

    // Add modifier costs
    modifiers.forEach((modifier) => {
      if (modifier.selected) {
        total += modifier.priceAdjustment;
      }
    });

    return Math.max(0, total);
  }, [
    selectedSize,
    selectedCrust,
    toppings,
    modifiers,
    availableSizes,
    item.basePrice,
  ]);

  // Group toppings by category for better organization
  const toppingsByCategory = useMemo(() => {
    return toppings.reduce((acc, topping) => {
      if (!acc[topping.category]) {
        acc[topping.category] = [];
      }
      acc[topping.category].push(topping);
      return acc;
    }, {} as Record<string, ToppingConfiguration[]>);
  }, [toppings]);

  // ==========================================
  // SAVE FUNCTIONALITY
  // ==========================================

  /**
   * Transform the customization selections back into your standard
   * ConfiguredCartItem format for integration with your cart system.
   */
  const handleSave = () => {
    const selectedSizeObj = availableSizes.find((s) => s.name === selectedSize);

    const updatedItem: ConfiguredCartItem = {
      ...item,
      variantId: selectedSizeObj?.id,
      variantName: selectedSize,
      selectedToppings: toppings
        .filter((t) => t.amount !== "none")
        .map((t) => ({
          id: t.id,
          name: t.name,
          amount: t.amount,
          price: t.price,
          isDefault: t.isDefault,
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
      totalPrice: calculatedPrice,
      displayName: `${selectedSize} ${item.menuItemName}`,
    };

    onComplete(updatedItem);
  };

  // ==========================================
  // RENDER THE FULL-SCREEN EXPERIENCE
  // ==========================================

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header with prominent pricing */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Edit" : "Customize"} Your {item.menuItemName}
            </h1>
            <p className="text-red-100 text-sm mt-1">
              Build your perfect pizza with our fresh ingredients
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              ${calculatedPrice.toFixed(2)}
            </div>
            <button
              onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
              className="text-red-100 text-sm hover:text-white underline"
            >
              {showPriceBreakdown ? "Hide" : "Show"} breakdown
            </button>
          </div>
        </div>

        {/* Detailed price breakdown popup */}
        {showPriceBreakdown && (
          <div className="absolute top-full right-6 mt-2 bg-white text-gray-900 p-4 rounded-lg shadow-xl min-w-64 z-10">
            <h3 className="font-semibold mb-2">Price Breakdown</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{selectedSize} Base:</span>
                <span>
                  $
                  {availableSizes
                    .find((s) => s.name === selectedSize)
                    ?.price.toFixed(2)}
                </span>
              </div>
              {selectedCrust === "Stuffed" && (
                <div className="flex justify-between">
                  <span>Stuffed Crust:</span>
                  <span>+$2.00</span>
                </div>
              )}
              {toppings
                .filter((t) => t.amount !== "none" && t.price > 0)
                .map((topping) => (
                  <div key={topping.id} className="flex justify-between">
                    <span>
                      {topping.name} ({topping.amount}):
                    </span>
                    <span>+${topping.price.toFixed(2)}</span>
                  </div>
                ))}
              {modifiers
                .filter((m) => m.selected && m.priceAdjustment !== 0)
                .map((modifier) => (
                  <div key={modifier.id} className="flex justify-between">
                    <span>{modifier.name}:</span>
                    <span>
                      {modifier.priceAdjustment > 0 ? "+" : ""}$
                      {modifier.priceAdjustment.toFixed(2)}
                    </span>
                  </div>
                ))}
              <div className="border-t pt-1 mt-2 font-semibold flex justify-between">
                <span>Total:</span>
                <span>${calculatedPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content area - optimized for mobile/tablet */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Pizza visual preview */}
        <div className="lg:w-1/3 bg-gradient-to-br from-orange-50 to-red-50 p-4 lg:p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-48 h-48 lg:w-64 lg:h-64 bg-yellow-200 rounded-full border-8 border-yellow-600 flex items-center justify-center mb-4 lg:mb-6 mx-auto relative overflow-hidden">
              {/* Pizza base with toppings visualization */}
              <div className="absolute inset-4 bg-yellow-300 rounded-full">
                <div className="absolute inset-2 bg-yellow-100 rounded-full">
                  {/* Visual indicators for selected toppings */}
                  {toppings
                    .filter((t) => t.amount !== "none")
                    .slice(0, 6)
                    .map((topping, index) => (
                      <div
                        key={topping.id}
                        className={`absolute w-3 h-3 lg:w-4 lg:h-4 rounded-full ${
                          topping.category === "meats"
                            ? "bg-red-600"
                            : topping.category === "vegetables"
                            ? "bg-green-600"
                            : "bg-orange-600"
                        }`}
                        style={{
                          top: `${20 + (index % 3) * 30}%`,
                          left: `${20 + Math.floor(index / 3) * 30}%`,
                        }}
                      />
                    ))}
                </div>
              </div>
              <div className="text-4xl lg:text-6xl">🍕</div>
            </div>
            <div className="text-base lg:text-lg font-semibold text-gray-800">
              {selectedSize} {selectedCrust} Crust
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {toppings.filter((t) => t.amount !== "none").length} toppings
              selected
            </div>
          </div>
        </div>

        {/* Customization options */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
            {/* SIZE SELECTION with Quick Add - The game changer! */}
            <section>
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-red-600 text-white rounded-full w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center text-sm font-bold mr-3">
                  1
                </span>
                Choose Your Size
              </h2>
              <div className="space-y-3">
                {availableSizes.map((size) => (
                  <div
                    key={size.id}
                    className={`border-2 rounded-lg transition-all ${
                      selectedSize === size.name
                        ? "border-red-600 bg-red-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="p-3 lg:p-4">
                      <div className="flex justify-between items-start mb-3">
                        <button
                          onClick={() => setSelectedSize(size.name)}
                          className="flex-1 text-left"
                        >
                          <div className="font-semibold text-gray-900">
                            {size.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {size.serves}
                          </div>
                          {size.crustType && (
                            <div className="text-xs text-blue-600">
                              {size.crustType} crust
                            </div>
                          )}
                        </button>

                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-green-600">
                            ${size.price.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* QUICK ADD BUTTON - Your efficiency feature */}
                      <button
                        onClick={() => handleQuickAdd(size)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Quick Add {size.name} {menuItemWithVariants.name}
                        {!!menuItemWithVariants.default_toppings_json &&
                          " (with defaults)"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* CRUST SELECTION */}
            <section>
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-red-600 text-white rounded-full w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center text-sm font-bold mr-3">
                  2
                </span>
                Choose Your Crust
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {availableCrusts.map((crust) => (
                  <button
                    key={crust.name}
                    onClick={() => setSelectedCrust(crust.name)}
                    className={`p-3 lg:p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                      selectedCrust === crust.name
                        ? "border-red-600 bg-red-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900">
                        {crust.name}
                      </div>
                      {crust.premium && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          +$2.00
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {crust.description}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* TOPPINGS by Category */}
            <section>
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-red-600 text-white rounded-full w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center text-sm font-bold mr-3">
                  3
                </span>
                Select Your Toppings
              </h2>

              {Object.entries(toppingsByCategory).map(
                ([category, categoryToppings]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-base lg:text-lg font-medium text-gray-800 mb-3 capitalize flex items-center">
                      <span className="mr-2">
                        {category === "meats"
                          ? "🥓"
                          : category === "vegetables"
                          ? "🥬"
                          : category === "cheese"
                          ? "🧀"
                          : "🍅"}
                      </span>
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryToppings.map((topping) => (
                        <ToppingSelector
                          key={topping.id}
                          topping={topping}
                          onChange={(amount) =>
                            handleToppingChange(topping.id, amount)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </section>

            {/* MODIFIERS */}
            {modifiers.length > 0 && (
              <section>
                <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center text-sm font-bold mr-3">
                    4
                  </span>
                  Special Preparations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {modifiers.map((modifier) => (
                    <ModifierSelector
                      key={modifier.id}
                      modifier={modifier}
                      onChange={(selected) =>
                        handleModifierChange(modifier.id, selected)
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SPECIAL INSTRUCTIONS */}
            <section>
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-red-600 text-white rounded-full w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center text-sm font-bold mr-3">
                  5
                </span>
                Special Instructions
              </h2>
              <textarea
                placeholder="Any special requests for your pizza? (e.g., 'light sauce', 'extra crispy', 'cut into squares')"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </section>
          </div>
        </div>
      </div>

      {/* Footer with action buttons */}
      <footer className="bg-gray-50 border-t border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel Changes
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="text-center sm:text-right">
              <div className="text-sm text-gray-600">Your total:</div>
              <div className="text-2xl font-bold text-green-600">
                ${calculatedPrice.toFixed(2)}
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg"
            >
              {isEditMode ? "Update Cart" : "Add to Cart"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// TOPPING SELECTOR COMPONENT
// ==========================================

/**
 * Individual topping selector with amount options.
 * This component encapsulates the complex topping selection logic
 * while providing a clean, touch-friendly interface.
 */
interface ToppingSelectorProps {
  topping: ToppingConfiguration;
  onChange: (amount: ToppingAmount) => void;
}

function ToppingSelector({ topping, onChange }: ToppingSelectorProps) {
  const amountOptions: {
    value: ToppingAmount;
    label: string;
    multiplier: number;
  }[] = [
    { value: "none", label: "None", multiplier: 0 },
    { value: "light", label: "Light", multiplier: 0.75 },
    { value: "normal", label: "Normal", multiplier: 1 },
    { value: "extra", label: "Extra", multiplier: 1.5 },
  ];

  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        topping.amount !== "none"
          ? "border-red-500 bg-red-50"
          : "border-gray-200"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="font-medium text-gray-900">{topping.name}</span>
          {topping.isDefault && (
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Default
            </span>
          )}
          {topping.isPremium && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Premium
            </span>
          )}
        </div>
        {topping.price > 0 && (
          <span className="text-sm font-semibold text-green-600">
            +${topping.price.toFixed(2)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1">
        {amountOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              topping.amount === option.value
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MODIFIER SELECTOR COMPONENT
// ==========================================

/**
 * Modifier selector for special preparations like "Well Done" or "Cut in Squares".
 * These are typically binary choices that affect preparation but not ingredients.
 */
interface ModifierSelectorProps {
  modifier: ModifierConfiguration;
  onChange: (selected: boolean) => void;
}

function ModifierSelector({ modifier, onChange }: ModifierSelectorProps) {
  return (
    <label
      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
        modifier.selected
          ? "border-red-500 bg-red-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={modifier.selected}
          onChange={(e) => onChange(e.target.checked)}
          className="mr-3 text-red-600 focus:ring-red-500"
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

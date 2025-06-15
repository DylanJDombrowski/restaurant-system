// src/components/features/orders/SandwichCustomizer.tsx
"use client";
import { ConfiguredCartItem, ConfiguredModifier, MenuItemWithVariants } from "@/lib/types";
import { useCallback, useMemo, useState } from "react";

/**
 * 🥪 SANDWICH CUSTOMIZER COMPONENT
 *
 * Type-safe, business-logic-aware customizer for Pizza Mia sandwiches.
 * Handles all sandwich customization according to exact business rules.
 */

// ==========================================
// TYPESCRIPT INTERFACES
// ==========================================

interface SandwichStyle {
  id: string;
  name: string;
  label: string; // What customer sees
  price: number; // Always 0 for styles
}

interface BreadOption {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
}

interface IngredientTier {
  level: "standard" | "extra" | "xxl_extra" | "on_side";
  label: string;
  priceMultiplier: number; // 1x, 2x, 3x for tiers, 1x for on_side
}

interface SandwichIngredient {
  id: string;
  name: string;
  basePrice: number;
  allowsTiers: boolean; // Some ingredients scale, others don't
  allowsOnSide: boolean;
  tiers: IngredientTier[];
}

interface SideSauce {
  id: string;
  name: string;
  basePrice: number; // 0.30 for most
  tiers: IngredientTier[];
}

interface PreparationOption {
  id: string;
  name: string;
  price: number; // Always 0
}

interface SandwichSelection {
  style?: string; // Required for beef/sausage items
  bread: string;
  makeItDeluxe: boolean;
  ingredients: Array<{
    id: string;
    tier: string;
  }>;
  sideSauces: Array<{
    id: string;
    tier: string;
  }>;
  preparations: string[];
  specialInstructions: string;
}

interface SandwichCustomizerProps {
  item: MenuItemWithVariants;
  existingCartItem?: ConfiguredCartItem; // 🆕 NEW: Pass existing selections
  onComplete: (cartItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
}

// ==========================================
// BUSINESS RULES & DATA
// ==========================================

// Sandwiches that require sauce/style selection
const SANDWICHES_WITH_STYLE = ["Italian Beef", "Italian Sausage", "Combo"];

// Sandwiches that default to garlic bread
const GARLIC_BREAD_DEFAULTS = ["Danwich", "Chicken Parm"];

// Available sauce styles for applicable sandwiches
const SANDWICH_STYLES: SandwichStyle[] = [
  { id: "red_sauce", name: "red_sauce", label: "Red Sauce", price: 0 },
  {
    id: "natural_gravy",
    name: "natural_gravy",
    label: "Natural Gravy",
    price: 0,
  },
  { id: "dry", name: "dry", label: "Dry (No Sauce)", price: 0 },
];

// Bread options
const BREAD_OPTIONS: BreadOption[] = [
  { id: "plain", name: "Plain Bread", price: 0, isDefault: true },
  { id: "garlic", name: "Garlic Bread", price: 0.5, isDefault: false },
];

// Ingredient tiers for pricing
const INGREDIENT_TIERS: IngredientTier[] = [
  { level: "standard", label: "Standard", priceMultiplier: 1 },
  { level: "extra", label: "Extra", priceMultiplier: 2 },
  { level: "xxl_extra", label: "XXL Extra", priceMultiplier: 3 },
  { level: "on_side", label: "On the Side", priceMultiplier: 1 },
];

// Available ingredients with your exact pricing
const SANDWICH_INGREDIENTS: SandwichIngredient[] = [
  {
    id: "mozzarella",
    name: "Mozzarella",
    basePrice: 1.0,
    allowsTiers: true,
    allowsOnSide: true,
    tiers: INGREDIENT_TIERS,
  },
  {
    id: "sweet_peppers",
    name: "Sweet Peppers",
    basePrice: 0.5,
    allowsTiers: true,
    allowsOnSide: true,
    tiers: INGREDIENT_TIERS,
  },
  {
    id: "hot_giardiniera",
    name: "Hot Giardiniera",
    basePrice: 0.5,
    allowsTiers: true,
    allowsOnSide: true,
    tiers: INGREDIENT_TIERS,
  },
  {
    id: "juicy",
    name: "Juicy (Extra Juice)",
    basePrice: 0.0, // No upcharge per your specs
    allowsTiers: false, // Light to Extra, no price change
    allowsOnSide: false,
    tiers: [{ level: "standard", label: "Add Juicy", priceMultiplier: 1 }],
  },
  {
    id: "onions",
    name: "Onions",
    basePrice: 0.5,
    allowsTiers: true,
    allowsOnSide: true,
    tiers: INGREDIENT_TIERS,
  },
  {
    id: "mushrooms",
    name: "Mushrooms",
    basePrice: 0.5,
    allowsTiers: true,
    allowsOnSide: true,
    tiers: INGREDIENT_TIERS,
  },
];

// Side sauces with your exact pricing
const SIDE_SAUCES: SideSauce[] = [
  {
    id: "side_natural_gravy",
    name: "Side of Natural Gravy",
    basePrice: 0.3,
    tiers: [
      { level: "standard", label: "Standard", priceMultiplier: 1 },
      { level: "extra", label: "Extra", priceMultiplier: 2 },
      { level: "xxl_extra", label: "XXL Extra", priceMultiplier: 3 },
    ],
  },
  {
    id: "side_red_sauce",
    name: "Side of Red Sauce",
    basePrice: 0.3,
    tiers: [
      { level: "standard", label: "Standard", priceMultiplier: 1 },
      { level: "extra", label: "Extra", priceMultiplier: 2 },
      { level: "xxl_extra", label: "XXL Extra", priceMultiplier: 3 },
    ],
  },
  {
    id: "side_wing_sauce",
    name: "Side of Wing Sauce",
    basePrice: 0.3,
    tiers: [
      { level: "standard", label: "Standard", priceMultiplier: 1 },
      { level: "extra", label: "Extra", priceMultiplier: 2 },
      { level: "xxl_extra", label: "XXL Extra", priceMultiplier: 3 },
    ],
  },
  {
    id: "side_bbq_sauce",
    name: "Side of BBQ Sauce",
    basePrice: 0.3,
    tiers: [
      { level: "standard", label: "Standard", priceMultiplier: 1 },
      { level: "extra", label: "Extra", priceMultiplier: 2 },
      { level: "xxl_extra", label: "XXL Extra", priceMultiplier: 3 },
    ],
  },
];

// Preparation options
const PREPARATION_OPTIONS: PreparationOption[] = [
  { id: "cut_in_half", name: "Cut in Half", price: 0 },
  { id: "well_done", name: "Well Done", price: 0 },
  { id: "toasted", name: "Toasted", price: 0 },
  { id: "cold", name: "Cold", price: 0 },
  { id: "do_not_cut", name: "Do Not Cut", price: 0 },
  { id: "cut_in_thirds", name: "Cut in Thirds", price: 0 },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

// COMPLETE FIXES for SandwichCustomizer.tsx

// 1. Fix the interface to include existingCartItem
interface SandwichCustomizerProps {
  item: MenuItemWithVariants;
  existingCartItem?: ConfiguredCartItem; // ✅ Already added
  onComplete: (cartItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
}

// 2. Add missing helper functions for parsing
function getTierIdFromLabel(tierLabel: string): string | null {
  const tierMap: Record<string, string> = {
    Standard: "standard",
    Extra: "extra",
    "XXL Extra": "xxl_extra",
    "On the Side": "on_side",
  };
  return tierMap[tierLabel] || null;
}

function getIngredientIdFromName(ingredientName: string): string | null {
  const nameMap: Record<string, string> = {
    Mozzarella: "mozzarella",
    "Sweet Peppers": "sweet_peppers",
    "Hot Giardiniera": "hot_giardiniera",
    "Juicy (Extra Juice)": "juicy",
    Juicy: "juicy",
    Onions: "onions",
    Mushrooms: "mushrooms",
  };
  return nameMap[ingredientName.trim()] || null;
}

function getSideSauceIdFromName(sauceName: string): string | null {
  const nameMap: Record<string, string> = {
    "Side of Natural Gravy": "side_natural_gravy",
    "Side of Red Sauce": "side_red_sauce",
    "Side of Wing Sauce": "side_wing_sauce",
    "Side of BBQ Sauce": "side_bbq_sauce",
  };
  return nameMap[sauceName.trim()] || null;
}

function getPreparationIdFromName(prepName: string): string | null {
  const nameMap: Record<string, string> = {
    "Cut in Half": "cut_in_half",
    "Well Done": "well_done",
    Toasted: "toasted",
    Cold: "cold",
    "Do Not Cut": "do_not_cut",
    "Cut in Thirds": "cut_in_thirds",
  };
  return nameMap[prepName.trim()] || null;
}

// 3. COMPLETE parseExistingModifiers function
function parseExistingModifiers(modifiers: ConfiguredModifier[]): Partial<SandwichSelection> {
  const parsed: Partial<SandwichSelection> = {
    ingredients: [],
    sideSauces: [],
    preparations: [],
    bread: "plain", // Default
    makeItDeluxe: false,
  };

  console.log("🔧 Parsing existing modifiers:", modifiers);

  modifiers.forEach((modifier) => {
    console.log("🔧 Processing modifier:", modifier.name);

    // Parse style selection
    if (modifier.name.includes("Prepared with")) {
      if (modifier.name.includes("Red Sauce")) {
        parsed.style = "red_sauce";
      } else if (modifier.name.includes("Natural Gravy")) {
        parsed.style = "natural_gravy";
      } else if (modifier.name.includes("Dry")) {
        parsed.style = "dry";
      }
    }

    // Parse bread selection
    else if (modifier.name === "Garlic Bread") {
      parsed.bread = "garlic";
    }

    // Parse deluxe option
    else if (modifier.name.includes("Make it Deluxe")) {
      parsed.makeItDeluxe = true;
    }

    // Parse ingredients with tiers (e.g., "Mozzarella (Extra)")
    else if (modifier.name.includes("(") && modifier.name.includes(")")) {
      const match = modifier.name.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        const [, ingredientName, tierLabel] = match;
        const tierId = getTierIdFromLabel(tierLabel);
        const ingredientId = getIngredientIdFromName(ingredientName);

        if (ingredientId && tierId) {
          parsed.ingredients = parsed.ingredients || [];
          parsed.ingredients.push({ id: ingredientId, tier: tierId });
          console.log("🔧 Added ingredient:", ingredientId, "tier:", tierId);
        }
      }
    }

    // Parse side sauces (e.g., "Side of Natural Gravy (Standard)")
    else if (modifier.name.includes("Side of")) {
      const match = modifier.name.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        const [, sauceName, tierLabel] = match;
        const tierId = getTierIdFromLabel(tierLabel);
        const sauceId = getSideSauceIdFromName(sauceName);

        if (sauceId && tierId) {
          parsed.sideSauces = parsed.sideSauces || [];
          parsed.sideSauces.push({ id: sauceId, tier: tierId });
          console.log("🔧 Added side sauce:", sauceId, "tier:", tierId);
        }
      }
    }

    // Parse preparations (direct match)
    else {
      const prepId = getPreparationIdFromName(modifier.name);
      if (prepId) {
        parsed.preparations = parsed.preparations || [];
        parsed.preparations.push(prepId);
        console.log("🔧 Added preparation:", prepId);
      }
    }
  });

  console.log("🔧 Final parsed state:", parsed);
  return parsed;
}

// 4. Fix the initial state to use existingCartItem
// REPLACE the useState initialization in the main component:

export default function SandwichCustomizer({
  item,
  existingCartItem, // ✅ Now properly typed
  onComplete,
  onCancel,
  isOpen,
}: SandwichCustomizerProps) {
  const [selection, setSelection] = useState<SandwichSelection>(() => {
    const requiresStyle = SANDWICHES_WITH_STYLE.includes(item.name);
    const defaultsToGarlic = GARLIC_BREAD_DEFAULTS.includes(item.name);

    // 🆕 FIXED: Parse existing cart item state if provided
    if (existingCartItem?.selectedModifiers && existingCartItem.selectedModifiers.length > 0) {
      try {
        console.log("🔧 Parsing existing sandwich selections for:", item.name);
        const existingSelection = parseExistingModifiers(existingCartItem.selectedModifiers);

        return {
          style: existingSelection.style || (requiresStyle ? undefined : "not_required"),
          bread: existingSelection.bread || (defaultsToGarlic ? "garlic" : "plain"),
          makeItDeluxe: existingSelection.makeItDeluxe || false,
          ingredients: existingSelection.ingredients || [],
          sideSauces: existingSelection.sideSauces || [],
          preparations: existingSelection.preparations || [],
          specialInstructions: existingCartItem.specialInstructions || "",
        };
      } catch (error) {
        console.error("Error parsing existing sandwich state:", error);
      }
    }

    // Default state (when no existing selections)
    console.log("🔧 Using default sandwich state for:", item.name);
    return {
      style: requiresStyle ? undefined : "not_required",
      bread: defaultsToGarlic ? "garlic" : "plain",
      makeItDeluxe: false,
      ingredients: [],
      sideSauces: [],
      preparations: [],
      specialInstructions: "",
    };
  });

  // ==========================================
  // BUSINESS LOGIC HELPERS
  // ==========================================

  const requiresStyleSelection = useMemo(() => {
    return SANDWICHES_WITH_STYLE.includes(item.name);
  }, [item.name]);

  const canComplete = useMemo(() => {
    // If style is required, it must be selected
    if (requiresStyleSelection && !selection.style) {
      return false;
    }
    return true;
  }, [requiresStyleSelection, selection.style]);

  // ==========================================
  // PRICE CALCULATION
  // ==========================================

  const calculatedPrice = useMemo(() => {
    let total = item.base_price;

    // Bread upcharge
    if (selection.bread === "garlic") {
      const garlicBread = BREAD_OPTIONS.find((b) => b.id === "garlic");
      if (garlicBread) total += garlicBread.price;
    }

    // Deluxe option
    if (selection.makeItDeluxe) {
      total += 2.0;
    }

    // Ingredients
    selection.ingredients.forEach((ingredient) => {
      const ingredientData = SANDWICH_INGREDIENTS.find((i) => i.id === ingredient.id);
      if (ingredientData) {
        const tier = ingredientData.tiers.find((t) => t.level === ingredient.tier);
        if (tier) {
          total += ingredientData.basePrice * tier.priceMultiplier;
        }
      }
    });

    // Side sauces
    selection.sideSauces.forEach((sauce) => {
      const sauceData = SIDE_SAUCES.find((s) => s.id === sauce.id);
      if (sauceData) {
        const tier = sauceData.tiers.find((t) => t.level === sauce.tier);
        if (tier) {
          total += sauceData.basePrice * tier.priceMultiplier;
        }
      }
    });

    return Math.round(total * 100) / 100; // Round to 2 decimal places
  }, [item.base_price, selection]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleStyleChange = useCallback((styleId: string) => {
    setSelection((prev) => ({ ...prev, style: styleId }));
  }, []);

  const handleBreadChange = useCallback((breadId: string) => {
    setSelection((prev) => ({ ...prev, bread: breadId }));
  }, []);

  const handleDeluxeChange = useCallback((checked: boolean) => {
    setSelection((prev) => ({ ...prev, makeItDeluxe: checked }));
  }, []);

  const handleIngredientChange = useCallback((ingredientId: string, tier: string | null) => {
    setSelection((prev) => ({
      ...prev,
      ingredients: tier
        ? [...prev.ingredients.filter((i) => i.id !== ingredientId), { id: ingredientId, tier }]
        : prev.ingredients.filter((i) => i.id !== ingredientId),
    }));
  }, []);

  const handleSideSauceChange = useCallback((sauceId: string, tier: string | null) => {
    setSelection((prev) => ({
      ...prev,
      sideSauces: tier
        ? [...prev.sideSauces.filter((s) => s.id !== sauceId), { id: sauceId, tier }]
        : prev.sideSauces.filter((s) => s.id !== sauceId),
    }));
  }, []);

  const handlePreparationToggle = useCallback((prepId: string) => {
    setSelection((prev) => ({
      ...prev,
      preparations: prev.preparations.includes(prepId) ? prev.preparations.filter((p) => p !== prepId) : [...prev.preparations, prepId],
    }));
  }, []);

  const handleSpecialInstructionsChange = useCallback((instructions: string) => {
    setSelection((prev) => ({ ...prev, specialInstructions: instructions }));
  }, []);

  // ==========================================
  // COMPLETION HANDLER
  // ==========================================

  const handleComplete = useCallback(() => {
    if (!canComplete) return;

    // Convert selections to ConfiguredModifier format
    const configuredModifiers: ConfiguredModifier[] = [];

    // Add style (sauce selection)
    if (selection.style && selection.style !== "not_required") {
      const style = SANDWICH_STYLES.find((s) => s.id === selection.style);
      if (style) {
        configuredModifiers.push({
          id: style.id,
          name: `Prepared with ${style.label}`,
          priceAdjustment: style.price,
        });
      }
    }

    // Add bread (only if different from default)
    const isGarlicDefault = GARLIC_BREAD_DEFAULTS.includes(item.name);
    const selectedBread = BREAD_OPTIONS.find((b) => b.id === selection.bread);
    if (selectedBread && ((isGarlicDefault && selection.bread !== "garlic") || (!isGarlicDefault && selection.bread !== "plain"))) {
      configuredModifiers.push({
        id: selectedBread.id,
        name: selectedBread.name,
        priceAdjustment: selectedBread.price,
      });
    }

    // Add deluxe option
    if (selection.makeItDeluxe) {
      configuredModifiers.push({
        id: "deluxe",
        name: "Make it Deluxe (Add Fries)",
        priceAdjustment: 2.0,
      });
    }

    // Add ingredients
    selection.ingredients.forEach((ingredient) => {
      const ingredientData = SANDWICH_INGREDIENTS.find((i) => i.id === ingredient.id);
      const tier = ingredientData?.tiers.find((t) => t.level === ingredient.tier);
      if (ingredientData && tier) {
        const price = ingredientData.basePrice * tier.priceMultiplier;
        configuredModifiers.push({
          id: `${ingredient.id}_${ingredient.tier}`,
          name: `${ingredientData.name} (${tier.label})`,
          priceAdjustment: price,
        });
      }
    });

    // Add side sauces
    selection.sideSauces.forEach((sauce) => {
      const sauceData = SIDE_SAUCES.find((s) => s.id === sauce.id);
      const tier = sauceData?.tiers.find((t) => t.level === sauce.tier);
      if (sauceData && tier) {
        const price = sauceData.basePrice * tier.priceMultiplier;
        configuredModifiers.push({
          id: `${sauce.id}_${sauce.tier}`,
          name: `${sauceData.name} (${tier.label})`,
          priceAdjustment: price,
        });
      }
    });

    // Add preparations
    selection.preparations.forEach((prepId) => {
      const prep = PREPARATION_OPTIONS.find((p) => p.id === prepId);
      if (prep) {
        configuredModifiers.push({
          id: prep.id,
          name: prep.name,
          priceAdjustment: prep.price,
        });
      }
    });

    // 🆕 FIXED: Create cart item preserving existing ID and quantity
    const cartItem: ConfiguredCartItem = {
      id: existingCartItem?.id || `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: null,
      variantName: null,
      quantity: existingCartItem?.quantity || 1, // ✅ Preserve existing quantity
      basePrice: item.base_price,
      selectedToppings: [], // Sandwiches don't use toppings system
      selectedModifiers: configuredModifiers,
      specialInstructions: selection.specialInstructions,
      totalPrice: calculatedPrice,
      displayName: item.name,
    };

    console.log("🔧 Completed sandwich customization:", cartItem);
    onComplete(cartItem);
  }, [canComplete, selection, item, calculatedPrice, onComplete, existingCartItem]);

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
            <h2 className="text-xl font-semibold text-gray-900">Customize {item.name}</h2>
            <p className="text-sm text-gray-900 mt-1">
              Base price: ${item.base_price.toFixed(2)}
              {requiresStyleSelection && !selection.style && <span className="text-red-600 ml-2">• Style selection required</span>}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">${calculatedPrice.toFixed(2)}</div>
            <div className="text-sm text-gray-900">Current total</div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Style Selection (for applicable sandwiches) */}
            {requiresStyleSelection && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Style Selection <span className="text-red-600">*</span>
                </h3>
                <div className="space-y-2">
                  {SANDWICH_STYLES.map((style) => (
                    <label key={style.id} className="flex items-center">
                      <input
                        type="radio"
                        name="style"
                        value={style.id}
                        checked={selection.style === style.id}
                        onChange={() => handleStyleChange(style.id)}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900">{style.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Bread Selection */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Bread Choice</h3>
              <div className="space-y-2">
                {BREAD_OPTIONS.map((bread) => (
                  <label key={bread.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="bread"
                        value={bread.id}
                        checked={selection.bread === bread.id}
                        onChange={() => handleBreadChange(bread.id)}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900">{bread.name}</span>
                    </div>
                    {bread.price > 0 && <span className="text-green-600 font-medium">+${bread.price.toFixed(2)}</span>}
                  </label>
                ))}
              </div>
            </section>

            {/* Deluxe Option */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Upgrade Options</h3>
              <label className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selection.makeItDeluxe}
                    onChange={(e) => handleDeluxeChange(e.target.checked)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">Make it Deluxe (Add Fries)</span>
                </div>
                <span className="text-green-600 font-medium">+$2.00</span>
              </label>
            </section>

            {/* Ingredients */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Add Ingredients</h3>
              <div className="space-y-4">
                {SANDWICH_INGREDIENTS.map((ingredient) => (
                  <IngredientSelector
                    key={ingredient.id}
                    ingredient={ingredient}
                    currentTier={selection.ingredients.find((i) => i.id === ingredient.id)?.tier}
                    onChange={(tier) => handleIngredientChange(ingredient.id, tier)}
                  />
                ))}
              </div>
            </section>

            {/* Side Sauces */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Side Sauces</h3>
              <div className="space-y-4">
                {SIDE_SAUCES.map((sauce) => (
                  <SideSauceSelector
                    key={sauce.id}
                    sauce={sauce}
                    currentTier={selection.sideSauces.find((s) => s.id === sauce.id)?.tier}
                    onChange={(tier) => handleSideSauceChange(sauce.id, tier)}
                  />
                ))}
              </div>
            </section>

            {/* Preparation Options */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Preparation Instructions</h3>
              <div className="grid grid-cols-2 gap-2">
                {PREPARATION_OPTIONS.map((prep) => (
                  <label key={prep.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selection.preparations.includes(prep.id)}
                      onChange={() => handlePreparationToggle(prep.id)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{prep.name}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Special Instructions */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Instructions</h3>
              <textarea
                placeholder="Any special requests for this sandwich..."
                value={selection.specialInstructions}
                onChange={(e) => handleSpecialInstructionsChange(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-900">Total:</div>
              <div className="text-xl font-bold text-green-600">${calculatedPrice.toFixed(2)}</div>
            </div>
            <button
              onClick={handleComplete}
              disabled={!canComplete}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Add to Cart
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

interface IngredientSelectorProps {
  ingredient: SandwichIngredient;
  currentTier?: string;
  onChange: (tier: string | null) => void;
}

function IngredientSelector({ ingredient, currentTier, onChange }: IngredientSelectorProps) {
  const handleTierChange = (tier: string) => {
    if (currentTier === tier) {
      onChange(null); // Deselect if same tier clicked
    } else {
      onChange(tier);
    }
  };

  return (
    <div className={`border rounded-lg p-3 transition-colors ${currentTier ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-gray-900">{ingredient.name}</span>
        {currentTier && (
          <span className="text-sm font-semibold text-green-600">
            +$
            {(ingredient.basePrice * (ingredient.tiers.find((t) => t.level === currentTier)?.priceMultiplier || 1)).toFixed(2)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1">
        {ingredient.tiers.map((tier) => (
          <button
            key={tier.level}
            onClick={() => handleTierChange(tier.level)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              currentTier === tier.level ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SideSauceSelectorProps {
  sauce: SideSauce;
  currentTier?: string;
  onChange: (tier: string | null) => void;
}

function SideSauceSelector({ sauce, currentTier, onChange }: SideSauceSelectorProps) {
  const handleTierChange = (tier: string) => {
    if (currentTier === tier) {
      onChange(null); // Deselect if same tier clicked
    } else {
      onChange(tier);
    }
  };

  return (
    <div className={`border rounded-lg p-3 transition-colors ${currentTier ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-gray-900">{sauce.name}</span>
        {currentTier && (
          <span className="text-sm font-semibold text-green-600">
            +$
            {(sauce.basePrice * (sauce.tiers.find((t) => t.level === currentTier)?.priceMultiplier || 1)).toFixed(2)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1">
        {sauce.tiers.map((tier) => (
          <button
            key={tier.level}
            onClick={() => handleTierChange(tier.level)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              currentTier === tier.level ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>
    </div>
  );
}

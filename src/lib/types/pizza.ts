// src/lib/types/pizza.ts - UPDATED with Fractional Support

import { ConfiguredModifier } from "./cart";
import { ID, ToppingAmount } from "./core";
import { Customization } from "./customization";
import { MenuItemWithVariants } from "./menu";

// ===================================================================
// ENHANCED PIZZA TOPPING SELECTION WITH FRACTIONAL SUPPORT
// ===================================================================

/**
 * Represents the placement of a topping on the pizza
 * Supports the fractional pricing structure from Menu Master.xlsx
 */
export type ToppingPlacement =
  | "whole" // Full pizza coverage
  | "left" // Left half
  | "right" // Right half
  | "quarter" // Single quarter
  | "three_quarters" // Three quarters
  | Array<"q1" | "q2" | "q3" | "q4">; // Specific quarter selection

/**
 * Enhanced pizza topping selection with placement support
 * This matches the fractional pricing in your Excel sheet
 */
export interface PizzaToppingSelection {
  customization_id: ID;
  amount: ToppingAmount;
  placement: ToppingPlacement;
}

/**
 * UI-friendly topping state for the customizer
 */
export interface ToppingState {
  id: string;
  name: string;
  category: string;
  displayCategory: string;
  amount: ToppingAmount;
  placement: ToppingPlacement;
  basePrice: number;
  calculatedPrice: number;
  isActive: boolean;
  isSpecialtyDefault: boolean;
  tier: "normal" | "premium" | "beef";
  icon: string;
}

// ===================================================================
// EXISTING TYPES (Updated for compatibility)
// ===================================================================

export interface CrustPricing {
  id: ID;
  restaurant_id: ID;
  size_code: string;
  crust_type: string;
  base_price: number;
  upcharge: number;
  is_available: boolean;
}

export interface PizzaTemplate {
  id: ID;
  restaurant_id: ID;
  menu_item_id: ID;
  name: string;
  markup_type: string;
  credit_limit_percentage: number;
  is_active: boolean;
  template_toppings?: PizzaTemplateTopping[];
}

export interface PizzaTemplateTopping {
  id: ID;
  template_id: ID;
  customization_id: ID;
  customization_name?: string;
  default_amount: string;
  is_removable: boolean;
  substitution_tier: string;
  sort_order: number;
}

export interface PizzaMenuItem extends MenuItemWithVariants {
  pizza_template?: PizzaTemplate;
}

export interface PizzaMenuResponse {
  pizza_items: PizzaMenuItem[];
  crust_pricing: CrustPricing[];
  pizza_customizations: Customization[];
  pizza_templates: PizzaTemplate[];
  available_sizes: string[];
  available_crusts: string[];
}

// ===================================================================
// ENHANCED PRICING REQUEST/RESPONSE WITH FRACTIONAL SUPPORT
// ===================================================================

export interface PizzaPriceCalculationRequest {
  restaurant_id: ID;
  menu_item_id: ID;
  size_code: string;
  crust_type: string;
  toppings?: PizzaToppingSelection[]; // Now includes placement
}

export interface PizzaPriceBreakdownItem {
  name: string;
  price: number;
  type: "specialty_base" | "regular_base" | "crust" | "topping" | "template_default" | "template_extra";
  amount?: string;
  placement?: string; // NEW: Shows placement info
  category?: string;
  is_default?: boolean;
  calculation_note?: string;
}

export interface PizzaPriceCalculationResponse {
  basePrice: number;
  basePriceSource: "specialty" | "regular";
  crustUpcharge: number;
  toppingCost: number;
  substitutionCredit: number;
  finalPrice: number;
  breakdown: PizzaPriceBreakdownItem[];
  sizeCode: string;
  crustType: string;
  estimatedPrepTime: number;
  warnings?: string[];
  template_info?: {
    name: string;
    included_toppings: string[];
    pricing_note: string;
  };
}

// ===================================================================
// UTILITY TYPES AND HELPERS
// ===================================================================

/**
 * Helper to convert placement to display string
 */
export function getPlacementDisplayText(placement: ToppingPlacement): string {
  if (typeof placement === "string") {
    switch (placement) {
      case "whole":
        return "Full";
      case "left":
        return "Left Half";
      case "right":
        return "Right Half";
      case "quarter":
        return "1/4";
      case "three_quarters":
        return "3/4";
      default:
        return "Full";
    }
  }

  // Handle quarter array
  if (Array.isArray(placement)) {
    const count = placement.length;
    if (count === 1) return "1/4";
    if (count === 2) return "1/2 (2 quarters)";
    if (count === 3) return "3/4";
    if (count === 4) return "Full";
    return `${count}/4`;
  }

  return "Full";
}

/**
 * Helper to convert placement to multiplier for pricing
 */
export function getPlacementMultiplier(placement: ToppingPlacement): number {
  if (typeof placement === "string") {
    switch (placement) {
      case "whole":
        return 1.0;
      case "left":
      case "right":
        return 0.5;
      case "quarter":
        return 0.25;
      case "three_quarters":
        return 0.75;
      default:
        return 1.0;
    }
  }

  // Handle quarter array
  if (Array.isArray(placement)) {
    return 0.25 * placement.length;
  }

  return 1.0;
}

/**
 * Validate topping selection
 */
export function validateToppingSelection(selection: PizzaToppingSelection): boolean {
  if (!selection.customization_id || !selection.amount) {
    return false;
  }

  if (Array.isArray(selection.placement)) {
    // Quarter array should have 1-4 quarters
    return selection.placement.length >= 1 && selection.placement.length <= 4;
  }

  return true;
}

// ===================================================================
// EXISTING CUSTOMIZATION TYPES (Unchanged)
// ===================================================================

export interface PizzaCustomizationsByCategory {
  toppings: Customization[];
  sauces: Customization[];
  preparation: Customization[];
}

export interface PizzaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PizzaCustomizationResult {
  availableCustomizations: PizzaCustomizationsByCategory;
  templateDefaults: Map<string, { amount: string; tier: string }>;
  defaultSelections: ConfiguredModifier[];
  calculatePrice: (selectedToppings: PizzaToppingSelection[]) => Promise<number>;
  validate: (selectedToppings: PizzaToppingSelection[]) => PizzaValidationResult;
}

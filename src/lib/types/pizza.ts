// src/lib/types/pizza.ts - Pizza-specific types

import { ID, ToppingAmount } from "./core";
import { MenuItemWithVariants } from "./menu";
import { Customization } from "./customization";

export interface CrustPricing {
  id: ID;
  restaurant_id: ID;
  size_code: string; // "10in", "12in", "14in", "16in"
  crust_type: string; // "thin", "double_dough", "gluten_free"
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

// Enhanced pizza menu item with template support
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

// Pizza pricing types
export interface PizzaPriceCalculationRequest {
  restaurant_id: ID;
  menu_item_id: ID;
  size_code: string;
  crust_type: string;
  toppings?: {
    customization_id: ID;
    amount: ToppingAmount;
  }[];
}

export interface PizzaPriceBreakdownItem {
  name: string;
  price: number;
  type:
    | "specialty_base"
    | "regular_base"
    | "crust"
    | "topping"
    | "template_default"
    | "template_extra";
  amount?: string;
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

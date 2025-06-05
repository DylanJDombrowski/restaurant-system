// src/lib/types/customization.ts - NEW unified customization system

import { ID, Timestamp } from "./core";

export type CustomizationCategory =
  | "topping_normal" // Pepperoni, Sausage, Mushrooms
  | "topping_premium" // Chicken, Meatballs
  | "topping_beef" // Italian Beef
  | "topping_cheese" // Extra Mozzarella, Feta
  | "topping_sauce" // BBQ, Alfredo, No Sauce (all free)
  | "white_meat" // Chicken white meat upgrades
  | "sides" // Included/optional sides
  | "preparation" // Well Done, Cut in Half
  | "condiments"; // Hot Sauce, Ranch

export type PricingType = "fixed" | "multiplied" | "tiered";

export interface CustomizationPricingRules {
  size_multipliers?: Record<string, number>;
  tier_multipliers?: Record<string, number>;
  variant_base_prices?: Record<string, number>;
  [key: string]: unknown;
}

export interface Customization {
  id: ID;
  restaurant_id: ID;
  name: string;
  category: CustomizationCategory;
  base_price: number;
  price_type: PricingType;
  pricing_rules: CustomizationPricingRules;
  applies_to: string[]; // ['pizza', 'chicken', etc.]
  sort_order: number;
  is_available: boolean;
  description?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

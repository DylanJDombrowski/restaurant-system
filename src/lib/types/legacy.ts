// src/lib/types/legacy.ts - TEMPORARY LEGACY TYPES
// 🚨 THESE WILL BE REMOVED AFTER COMPONENT MIGRATION IS COMPLETE

import { ID, Timestamp } from "./core";

/**
 * @deprecated Use Customization interface instead
 * Legacy topping interface for backwards compatibility
 */
export interface Topping {
  id: ID;
  restaurant_id: ID;
  name: string;
  category: string;
  sort_order: number;
  is_available: boolean;
  created_at: Timestamp;
  is_premium: boolean;
  base_price: number;
}

/**
 * @deprecated Use Customization interface instead
 * Legacy modifier interface for backwards compatibility
 */
export interface Modifier {
  id: ID;
  restaurant_id: ID;
  name: string;
  category: string;
  price_adjustment: number;
  is_available: boolean;
  created_at: Timestamp;
  selected: boolean; // UI state
}

/**
 * Convert Customization to legacy Topping format
 */
export function customizationToLegacyTopping(
  customization: import("./customization").Customization
): Topping {
  return {
    id: customization.id,
    restaurant_id: customization.restaurant_id,
    name: customization.name,
    category: customization.category.replace("topping_", ""),
    sort_order: customization.sort_order,
    is_available: customization.is_available,
    created_at: customization.created_at,
    is_premium:
      customization.category === "topping_premium" ||
      customization.category === "topping_beef",
    base_price: customization.base_price,
  };
}

/**
 * Convert Customization to legacy Modifier format
 */
export function customizationToLegacyModifier(
  customization: import("./customization").Customization
): Modifier {
  return {
    id: customization.id,
    restaurant_id: customization.restaurant_id,
    name: customization.name,
    category: customization.category,
    price_adjustment: customization.base_price,
    is_available: customization.is_available,
    created_at: customization.created_at,
    selected: false,
  };
}

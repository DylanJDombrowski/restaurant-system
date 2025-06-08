// src/lib/types/menu.ts - Enhanced with chicken support

import { ID, Timestamp } from "./core";

export interface MenuCategory {
  id: ID;
  restaurant_id: ID;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: ID;
  restaurant_id: ID;
  category_id?: ID;
  name: string;
  description?: string;
  base_price: number;
  prep_time_minutes: number;
  is_available: boolean;
  item_type: string;
  allows_custom_toppings: boolean;
  variants?: MenuItemVariant[];
  image_url?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MenuItemVariant {
  id: ID;
  menu_item_id: ID;
  name: string;
  price: number;
  size_code: string;
  crust_type?: string;
  serves?: string;
  sort_order: number;
  is_available: boolean;
  prep_time_minutes: number;
  white_meat_upcharge?: number; // NEW: For chicken variants
}

// Enhanced types with relationships
export type MenuItemWithCategory = MenuItem & {
  category?: MenuCategory;
};

export type MenuItemWithVariants = MenuItem & {
  category?: MenuCategory;
  variants: MenuItemVariant[];
};

// ===================================================================
// ITEM-SPECIFIC VARIANT TYPES
// ===================================================================

// Chicken variants always have white_meat_upcharge
export interface ChickenVariant extends MenuItemVariant {
  white_meat_upcharge: number; // Required for chicken
}

// Pizza variants may have different crust pricing
export interface PizzaVariant extends MenuItemVariant {
  crust_type: string; // Required for pizza
}

// Generic variant with strict item type checking
export type TypedMenuItemVariant<T extends string> = T extends "chicken"
  ? ChickenVariant
  : T extends "pizza"
  ? PizzaVariant
  : MenuItemVariant;

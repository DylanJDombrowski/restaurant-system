// src/lib/types/menu.ts - Menu system

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
}

// Enhanced types with relationships
export type MenuItemWithCategory = MenuItem & {
  category?: MenuCategory;
};

export type MenuItemWithVariants = MenuItem & {
  category?: MenuCategory;
  variants: MenuItemVariant[];
};

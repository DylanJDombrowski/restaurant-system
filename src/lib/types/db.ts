// src/lib/types/db.ts - Clean Database Types
// This file provides type definitions that match your actual database structure
// and integrates smoothly with the enhanced types in index.ts

/**
 * ===================================================================
 * CORE ENUMS
 * ===================================================================
 * These match the enums in your Supabase database
 */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type StaffRole = "staff" | "manager" | "admin";

/**
 * ===================================================================
 * RESTAURANT AND STAFF TABLES
 * ===================================================================
 */

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  restaurant_id: string;
  email: string;
  name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
}

/**
 * ===================================================================
 * CUSTOMER MANAGEMENT TABLES
 * ===================================================================
 */

export interface Customer {
  id: string;
  restaurant_id: string;
  phone: string;
  email?: string;
  name?: string;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  restaurant_id: string;
  customer_id: string;
  customer_phone: string;
  customer_name: string;
  customer_email?: string;
  address: string;
  city: string;
  zip: string;
  delivery_instructions?: string;
  is_default: boolean;
  created_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  order_id?: string;
  points_earned: number;
  points_redeemed: number;
  transaction_type: string;
  description?: string;
  created_at: string;
}

/**
 * ===================================================================
 * MENU SYSTEM TABLES
 * ===================================================================
 */

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * Base MenuItem interface with all the enhanced fields
 * This reflects your current database structure including new columns
 */
export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  description?: string;
  base_price: number;
  prep_time_minutes: number;
  is_available: boolean;

  // Enhanced fields for the new menu system
  item_type: string; // 'pizza', 'appetizer', 'drink', etc.
  allows_custom_toppings: boolean; // Whether this item can be customized
  default_toppings_json?: DefaultToppingsConfig; // Default pizza toppings
  image_url?: string; // Product image URL

  created_at: string;
  updated_at: string;
}

/**
 * Menu Item Variants - for different sizes, crusts, portions
 * Allows the same item to have multiple price points
 */
export interface MenuItemVariant {
  id: string;
  menu_item_id: string;
  name: string; // "Small 10\"", "Medium 12\"", etc.
  price: number; // Price for this specific variant
  serves?: string; // "Serves 1-2", "Feeds 4-6", etc.
  crust_type?: string; // For pizzas: "thin", "thick", etc.
  sort_order: number;
  is_available: boolean;
}

/**
 * Toppings - ingredients that can be added to customizable items
 */
export interface Topping {
  id: string;
  restaurant_id: string;
  name: string;
  category: string; // "meats", "vegetables", "cheese"
  is_premium: boolean; // Whether this costs extra
  is_available: boolean;
}

/**
 * Topping Prices - pricing per variant (size affects topping cost)
 */
export interface MenuItemVariantToppingPrice {
  id: string;
  menu_item_variant_id: string;
  topping_id: string;
  price: number; // Price for this topping on this variant
}

/**
 * Modifiers - additional customizations like "Well Done", "Cut in Squares"
 */
export interface Modifier {
  id: string;
  restaurant_id: string;
  name: string;
  price_adjustment: number; // Amount to add/subtract from price
  is_available: boolean;
}

/**
 * Junction table linking modifiers to menu items
 */
export interface MenuItemModifier {
  menu_item_id: string;
  modifier_id: string;
}

/**
 * ===================================================================
 * ORDER MANAGEMENT TABLES
 * ===================================================================
 */

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id?: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  order_type?: string; // 'pickup' or 'delivery'
  status: OrderStatus;

  // Delivery information
  customer_address?: string;
  customer_city?: string;
  customer_zip?: string;
  delivery_instructions?: string;

  // Pricing breakdown
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  delivery_fee: number;
  total: number;

  // Scheduling (for future orders)
  scheduled_for?: string;
  is_scheduled?: boolean;
  estimated_ready_time?: string;
  estimated_delivery_time?: string;

  // Additional details
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Order Items - individual items within an order
 * Now supports complex customizations through JSON fields
 */
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_variant_id?: string; // Links to specific size/variant
  quantity: number;
  unit_price: number;
  total_price: number;

  // JSON fields for storing customizations
  // These store the customer's selections at time of order
  selected_toppings_json?: SelectedTopping[];
  selected_modifiers_json?: SelectedModifier[];

  special_instructions?: string;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_at: string;
  changed_by?: string;
  notes?: string;
}

/**
 * ===================================================================
 * STRUCTURED JSON TYPES
 * ===================================================================
 * These define the structure of JSON fields in the database
 */

/**
 * Structure for selected toppings in order items
 * This captures what the customer chose, including pricing at time of order
 */
export interface SelectedTopping {
  id: string;
  name: string;
  price: number; // Price at time of order
  category: string;
  amount?: "light" | "normal" | "extra"; // How much of this topping
}

/**
 * Structure for selected modifiers in order items
 */
export interface SelectedModifier {
  id: string;
  name: string;
  price_adjustment: number; // Price impact at time of order
}

/**
 * Structure for default toppings on specialty pizzas
 * Stored in the menu_items.default_toppings_json field
 */
export interface DefaultToppingsConfig {
  toppings: Array<{
    id: string;
    name: string;
    amount: "light" | "normal" | "extra";
  }>;
}

/**
 * ===================================================================
 * SUPABASE DATABASE TYPE STRUCTURE
 * ===================================================================
 * This provides a Supabase-compatible Database type
 * that our enhanced types can reference
 */

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: Restaurant;
        Insert: Omit<Restaurant, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Restaurant, "id" | "created_at" | "updated_at">>;
      };
      staff: {
        Row: Staff;
        Insert: Omit<Staff, "id" | "created_at">;
        Update: Partial<Omit<Staff, "id" | "created_at">>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Customer, "id" | "created_at" | "updated_at">>;
      };
      customer_addresses: {
        Row: CustomerAddress;
        Insert: Omit<CustomerAddress, "id" | "created_at">;
        Update: Partial<Omit<CustomerAddress, "id" | "created_at">>;
      };
      loyalty_transactions: {
        Row: LoyaltyTransaction;
        Insert: Omit<LoyaltyTransaction, "id" | "created_at">;
        Update: Partial<Omit<LoyaltyTransaction, "id" | "created_at">>;
      };
      menu_categories: {
        Row: MenuCategory;
        Insert: Omit<MenuCategory, "id">;
        Update: Partial<Omit<MenuCategory, "id">>;
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<MenuItem, "id" | "created_at" | "updated_at">>;
      };
      menu_item_variants: {
        Row: MenuItemVariant;
        Insert: Omit<MenuItemVariant, "id">;
        Update: Partial<Omit<MenuItemVariant, "id">>;
      };
      toppings: {
        Row: Topping;
        Insert: Omit<Topping, "id">;
        Update: Partial<Omit<Topping, "id">>;
      };
      menu_item_variant_topping_prices: {
        Row: MenuItemVariantToppingPrice;
        Insert: Omit<MenuItemVariantToppingPrice, "id">;
        Update: Partial<Omit<MenuItemVariantToppingPrice, "id">>;
      };
      modifiers: {
        Row: Modifier;
        Insert: Omit<Modifier, "id">;
        Update: Partial<Omit<Modifier, "id">>;
      };
      menu_item_modifiers: {
        Row: MenuItemModifier;
        Insert: MenuItemModifier;
        Update: Partial<MenuItemModifier>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Order, "id" | "created_at" | "updated_at">>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id" | "created_at">;
        Update: Partial<Omit<OrderItem, "id" | "created_at">>;
      };
      order_status_history: {
        Row: OrderStatusHistory;
        Insert: Omit<OrderStatusHistory, "id" | "changed_at">;
        Update: Partial<Omit<OrderStatusHistory, "id" | "changed_at">>;
      };
    };
    Enums: {
      order_status: OrderStatus;
    };
  };
}

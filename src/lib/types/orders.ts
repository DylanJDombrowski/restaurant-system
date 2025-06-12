// src/lib/types/orders.ts - Order management (FIXED - import CustomerAddress)

import { ID, Timestamp, OrderStatus, OrderType } from "./core";
import { MenuItem, MenuItemVariant } from "./menu";
import { CustomerAddress } from "./loyalty"; // ✅ Import from loyalty.ts

export interface Customer {
  id: ID;
  restaurant_id: ID;
  phone: string;
  email?: string;
  name?: string;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  last_order_date?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Order {
  id: ID;
  restaurant_id: ID;
  customer_id?: ID;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  order_type?: OrderType;
  status: OrderStatus;
  customer_address?: string;
  customer_city?: string;
  customer_zip?: string;
  delivery_instructions?: string;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  delivery_fee: number;
  total: number;
  special_instructions?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface OrderItem {
  id: ID;
  order_id: ID;
  menu_item_id: ID;
  menu_item_variant_id?: ID;
  quantity: number;
  unit_price: number;
  total_price: number;
  selected_toppings_json?: unknown;
  selected_modifiers_json?: unknown;
  special_instructions?: string;
  created_at: Timestamp;
}

// Enhanced types with relationships
export type OrderItemWithDetails = OrderItem & {
  menu_item?: MenuItem;
  menu_item_variant?: MenuItemVariant;
};

export type OrderWithItems = Order & {
  order_items?: OrderItemWithDetails[];
  customer?: Customer;
};

export type CustomerWithStats = Customer & {
  addresses?: CustomerAddress[];
};

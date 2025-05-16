import { Database } from "./database.types";

export type { Database } from "./database.types";

// Re-export table types for easier imports
export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];
export type Staff = Database["public"]["Tables"]["staff"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerAddress =
  Database["public"]["Tables"]["customer_addresses"]["Row"];
export type LoyaltyTransaction =
  Database["public"]["Tables"]["loyalty_transactions"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuCategory =
  Database["public"]["Tables"]["menu_categories"]["Row"];

// Insert types for forms
export type InsertOrder = Database["public"]["Tables"]["orders"]["Insert"];
export type InsertOrderItem =
  Database["public"]["Tables"]["order_items"]["Insert"];
export type InsertCustomer =
  Database["public"]["Tables"]["customers"]["Insert"];
export type InsertCustomerAddress =
  Database["public"]["Tables"]["customer_addresses"]["Insert"];
export type InsertMenuItem =
  Database["public"]["Tables"]["menu_items"]["Insert"];
export type InsertStaff = Database["public"]["Tables"]["staff"]["Insert"];

// Update types
export type UpdateOrder = Database["public"]["Tables"]["orders"]["Update"];
export type UpdateMenuItem =
  Database["public"]["Tables"]["menu_items"]["Update"];
export type UpdateCustomer =
  Database["public"]["Tables"]["customers"]["Update"];
export type UpdateStaff = Database["public"]["Tables"]["staff"]["Update"];

// Enums
export type OrderStatus = Database["public"]["Enums"]["order_status"];

// Custom business types
export type OrderWithItems = Order & {
  order_items: (OrderItem & { menu_item: MenuItem })[];
  customer?: Customer;
};

export type MenuItemWithCategory = MenuItem & {
  category?: MenuCategory;
};

export type CustomerWithStats = Customer & {
  order_count?: number;
  last_order_date?: string;
  addresses?: CustomerAddress[];
};

export type CustomerAddressWithDetails = CustomerAddress & {
  customer?: Customer;
};

// Form data types
export interface CreateOrderFormData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderType: "pickup" | "delivery";
  customerAddress?: string;
  customerCity?: string;
  customerZip?: string;
  deliveryInstructions?: string;
  specialInstructions?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
  }>;
}

// Customer lookup response
export interface CustomerLookupResponse {
  customer: Customer | null;
  addresses?: CustomerAddress[];
}

// API Response types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface OrderSummary {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
}

// Enhanced customer with recent activity
export interface CustomerWithActivity extends Customer {
  recent_orders?: Order[];
  favorite_items?: MenuItem[];
  addresses?: CustomerAddress[];
}

export interface CreateStaffFormData {
  name: string;
  email: string;
  role: "staff" | "manager" | "admin";
  password: string;
  restaurant_id: string;
}

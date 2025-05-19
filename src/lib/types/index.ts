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

// Updated Menu System Types
export type MenuCategory =
  Database["public"]["Tables"]["menu_categories"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuItemVariant =
  Database["public"]["Tables"]["menu_item_variants"]["Row"];
export type Topping = Database["public"]["Tables"]["toppings"]["Row"];
export type MenuItemVariantToppingPrice =
  Database["public"]["Tables"]["menu_item_variant_topping_prices"]["Row"];
export type Modifier = Database["public"]["Tables"]["modifiers"]["Row"];
export type MenuItemModifier =
  Database["public"]["Tables"]["menu_item_modifiers"]["Row"];

export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

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
export type InsertMenuItemVariant =
  Database["public"]["Tables"]["menu_item_variants"]["Insert"];
export type InsertTopping = Database["public"]["Tables"]["toppings"]["Insert"];
export type InsertMenuItemVariantToppingPrice =
  Database["public"]["Tables"]["menu_item_variant_topping_prices"]["Insert"];
export type InsertModifier =
  Database["public"]["Tables"]["modifiers"]["Insert"];
export type InsertStaff = Database["public"]["Tables"]["staff"]["Insert"];

// Update types
export type UpdateOrder = Database["public"]["Tables"]["orders"]["Update"];
export type UpdateMenuItem =
  Database["public"]["Tables"]["menu_items"]["Update"];
export type UpdateMenuItemVariant =
  Database["public"]["Tables"]["menu_item_variants"]["Update"];
export type UpdateCustomer =
  Database["public"]["Tables"]["customers"]["Update"];
export type UpdateStaff = Database["public"]["Tables"]["staff"]["Update"];

// Enums
export type OrderStatus = Database["public"]["Enums"]["order_status"];
// export type StaffRole = Database["public"]["Enums"]["staff_role_enum"];
// export type OrderType = Database["public"]["Enums"]["order_type_enum"];

// Custom business types / Hydrated types for frontend use

export type ConfiguredTopping = Topping & { price: number; quantity?: number }; // Price here is specific to the item variant
export type ConfiguredModifier = Modifier & { quantity?: number };

// Represents an item being configured in the UI or an item in the cart
export type CartItem = {
  id: string; // Could be a unique ID generated for the cart item, or combo of item+variant+config
  baseMenuItem: MenuItem;
  selectedVariant: MenuItemVariant | null; // Null if item has no variants (e.g. a drink)
  selectedToppings: ConfiguredTopping[];
  selectedModifiers: ConfiguredModifier[];
  quantity: number;
  itemLevelSpecialInstructions: string | null;
  calculatedPrice: number; // Price for one unit of this configured item
};

// This replaces the old OrderItem that only had menu_item_id
export type OrderItemWithDetails = OrderItem & {
  menu_item: MenuItem; // Base menu item
  menu_item_variant?: MenuItemVariant; // Specific variant like size/crust
  // selected_toppings_json and selected_modifiers_json are already on OrderItem
  // You'd parse them on the frontend if needed for display
};

export type OrderWithItems = Order & {
  order_items: OrderItemWithDetails[]; // Use the more detailed OrderItemWithDetails
  customer?: Customer;
};

// Enhanced MenuItem for display, including its variants and category
export type MenuItemWithRelations = MenuItem & {
  category?: MenuCategory;
  variants: MenuItemVariant[]; // All available variants for this item
  // Toppings and modifiers would likely be fetched separately based on context
  // or linked through variants for pricing.
};

export type CustomerWithStats = Customer & {
  order_count?: number;
  last_order_date?: string;
  addresses?: CustomerAddress[];
};

export type CustomerAddressWithDetails = CustomerAddress & {
  customer?: Customer;
};

export type MenuItemWithCategory = MenuItem & {
  category?: MenuCategory;
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
  specialInstructions?: string; // Order-level special instructions
  // items will now be an array of CartItem or similar structure
  items: CartItem[];
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
  favorite_items?: MenuItem[]; // This would require more complex logic to determine
  addresses?: CustomerAddress[];
}

export interface CreateStaffFormData {
  name: string;
  email: string;
  role: "staff" | "manager" | "admin";
  password: string;
  restaurant_id: string;
}

// Type for fetching menu data for the UI
export type FullMenuCategory = MenuCategory & {
  menu_items: MenuItemWithRelations[];
};

// src/lib/types/index.ts - Clean, Working Type System
// Starting simple and building up gradually

/**
 * ===================================================================
 * CORE ENUMS AND CONSTANTS
 * ===================================================================
 * These define the fixed values our system recognizes
 */

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

export type StaffRole = "staff" | "manager" | "admin";
export type OrderType = "pickup" | "delivery";

/**
 * ===================================================================
 * BASIC DATABASE INTERFACES
 * ===================================================================
 * These match your current database structure exactly
 */

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  config: Record<string, unknown>; // More specific than 'any'
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

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * Base MenuItem interface - this reflects your actual database structure
 * Including the enhanced fields you've added during migration
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
  item_type: string; // 'pizza', 'appetizer', etc.
  allows_custom_toppings: boolean; // Whether this item can be customized
  default_toppings_json?: unknown; // JSON field for default toppings
  image_url?: string; // Product image
  variants?: MenuItemVariant[]; // Array of variants for this item
  created_at: string;
  updated_at: string;
}

/**
 * Menu Item Variants - for sizes, crusts, portions
 * This allows different sizes of the same item with different prices
 */
export interface MenuItemVariant {
  id: string;
  menu_item_id: string;
  name: string; // "Small 10\"", "Medium 12\"", etc.
  price: number; // Price for this specific variant
  serves?: string; // "Serves 1-2", etc.
  crust_type?: string; // For pizzas - "thin", "thick", etc.
  sort_order: number;
  is_available: boolean;
  prep_time_minutes: number;
  size_code: string;
}

/**
 * Toppings - ingredients that can be added to customizable items
 */
export interface Topping {
  id: string;
  restaurant_id: string;
  name: string;
  category: string; // "meats", "vegetables", "cheese", etc.
  is_premium: boolean; // Whether this topping costs extra
  is_available: boolean;
}

// Define the topping amount type once and use it everywhere
export type ToppingAmount = "none" | "light" | "normal" | "extra";

// Define the configured topping interface consistently
export interface ConfiguredTopping {
  id: string;
  name: string;
  amount: ToppingAmount;
  price: number;
  isDefault: boolean;
  category?: string; // Add this for better organization
}

// Define the configured modifier interface
export interface ConfiguredModifier {
  id: string;
  name: string;
  priceAdjustment: number;
}

// Define the cart item interface that all components will use
export interface ConfiguredCartItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  basePrice: number;
  selectedToppings: ConfiguredTopping[];
  selectedModifiers: ConfiguredModifier[];
  specialInstructions: string | null;
  totalPrice: number;
  displayName: string;
}

/**
 * Modifiers - additional modifications like "Well Done", "Cut in Squares"
 */
export interface Modifier {
  id: string;
  restaurant_id: string;
  name: string;
  price_adjustment: number; // How much this modifier adds/subtracts
  is_available: boolean;
}

/**
 * Customer management
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
  last_order_date?: string; // 🆕 ADD THIS LINE
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

/**
 * Order management
 */
export interface Order {
  id: string;
  restaurant_id: string;
  customer_id?: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  order_type?: OrderType;
  status: OrderStatus;

  // Delivery fields
  customer_address?: string;
  customer_city?: string;
  customer_zip?: string;
  delivery_instructions?: string;

  // Pricing
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  delivery_fee: number;
  total: number;

  // Additional details
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Order Items - individual items within an order
 * This now supports both simple items and complex customizable items
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
  selected_toppings_json?: unknown; // Store topping selections
  selected_modifiers_json?: unknown; // Store modifier selections

  special_instructions?: string;
  created_at: string;
}

/**
 * ===================================================================
 * ENHANCED TYPES FOR FRONTEND USE
 * ===================================================================
 * These add relationships and computed properties for better UI display
 */

/**
 * MenuItem with its category information
 * Used throughout the staff interface for simple displays
 */
export type ItemCategory = "pizza" | "sandwich" | "appetizer" | "side" | "beverage" | "dessert";

// Customization complexity levels
export type CustomizationLevel =
  | "full" // Pizza: size, crust, toppings, modifiers
  | "variants" // Sandwiches: size + limited customization
  | "simple" // Beverages: size selection only
  | "none"; // Sides: add directly to cart

export type MenuItemWithCategory = MenuItem & {
  category?: MenuCategory;
};

/**
 * MenuItem with all its variants
 * Used in the customer interface where size/variant selection is important
 */
export type MenuItemWithVariants = MenuItem & {
  category?: MenuCategory;
  variants: MenuItemVariant[];
};

/**
 * Order item with full menu information
 * Used for displaying orders with complete item details
 */
export type OrderItemWithDetails = OrderItem & {
  menu_item?: MenuItem;
  menu_item_variant?: MenuItemVariant;
};

/**
 * Complete order with all related information
 * This is the main type used throughout the application for order display
 */
export type OrderWithItems = Order & {
  order_items?: OrderItemWithDetails[];
  customer?: Customer;
};

/**
 * Customer with additional statistics
 * Used for customer lookup and loyalty displays
 */
export type CustomerWithStats = Customer & {
  addresses?: CustomerAddress[];
};

/**
 * ===================================================================
 * INSERT TYPES FOR FORMS
 * ===================================================================
 * These represent the data needed when creating new records
 */

export type InsertOrder = Omit<Order, "id" | "created_at" | "updated_at">;
export type InsertOrderItem = Omit<OrderItem, "id" | "created_at">;
export type InsertCustomer = Omit<Customer, "id" | "created_at" | "updated_at">;
export type InsertCustomerAddress = Omit<CustomerAddress, "id" | "created_at">;
export type InsertStaff = Omit<Staff, "id" | "created_at">;
export type InsertMenuItem = Omit<MenuItem, "id" | "created_at" | "updated_at">;
export type InsertMenuItemVariant = Omit<MenuItemVariant, "id">;
export type InsertTopping = Omit<Topping, "id">;
export type InsertModifier = Omit<Modifier, "id">;
export type SafeString = string | null | undefined;

/**
 * ===================================================================
 * API AND FORM INTERFACES
 * ===================================================================
 * These define the structure of data flowing between frontend and backend
 */

/**
 * Standard API response wrapper
 * All API endpoints return data in this format for consistency
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Customer lookup response from the search API
 */
export interface CustomerLookupResponse {
  customer: Customer | null;
  addresses?: CustomerAddress[];
}

/**
 * Order summary for price calculations
 */
export interface OrderSummary {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
}

/**
 * Form data for creating new staff members
 */
export interface CreateStaffFormData {
  name: string;
  email: string;
  role: StaffRole;
  password: string;
  restaurant_id: string;
}

/**
 * ===================================================================
 * UTILITY FUNCTIONS
 * ===================================================================
 * Helper functions for working with the types
 */

/**
 * Type guard to check if an item allows customization
 */
export function isCustomizableItem(item: MenuItem): boolean {
  return item.allows_custom_toppings === true;
}

/**
 * Type guard to check if an item is a pizza
 */
export function isPizzaItem(item: MenuItem): boolean {
  return item.item_type === "pizza";
}

// Helper function to safely handle null/undefined strings
export function safeString(value: SafeString, defaultValue: string = ""): string {
  return value ?? defaultValue;
}

// Helper function to safely handle null/undefined optional strings
export function safeOptionalString(value: SafeString): string | undefined {
  return value === null ? undefined : value ?? undefined;
}

export function getItemCustomizationLevel(item: MenuItem): CustomizationLevel {
  // Force pizza items to full customization
  if (item.item_type === "pizza" || item.allows_custom_toppings) {
    return "full";
  }

  // Items with multiple variants but no toppings = variants only
  if (item.variants && item.variants.length > 1) {
    return "variants";
  }

  // Single variant items = simple
  if (item.variants && item.variants.length === 1) {
    return "simple";
  }

  // No variants, no customization = direct add
  return "none";
}

export function getItemCategory(item: MenuItem): ItemCategory {
  const itemType = item.item_type?.toLowerCase() || "";

  if (itemType.includes("pizza")) return "pizza";
  if (itemType.includes("sandwich") || itemType.includes("sub")) return "sandwich";
  if (itemType.includes("appetizer") || itemType.includes("app")) return "appetizer";
  if (itemType.includes("side")) return "side";
  if (itemType.includes("beverage") || itemType.includes("drink")) return "beverage";
  if (itemType.includes("dessert")) return "dessert";

  // Default categorization by name patterns
  const name = item.name?.toLowerCase() || "";
  if (name.includes("pizza")) return "pizza";
  if (name.includes("wing") || name.includes("bread")) return "appetizer";
  if (name.includes("soda") || name.includes("water")) return "beverage";

  return "side"; // Default fallback
}

export function shouldShowCustomizer(item: MenuItem): boolean {
  const level = getItemCustomizationLevel(item);
  return level === "full";
}

// Check if item needs variant selection
export function needsVariantSelection(item: MenuItem): boolean {
  const level = getItemCustomizationLevel(item);
  return level === "variants" || level === "simple";
}

/**
 * ===================================================================
 * CONSTANTS
 * ===================================================================
 */

export const DEFAULT_PREP_TIME = 25; // minutes
export const DEFAULT_TAX_RATE = 0.08; // 8%
export const DEFAULT_DELIVERY_FEE = 3.99;

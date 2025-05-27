// src/lib/types/index.ts - Organized & Enhanced Type System
// Restructured for better organization and new customization system

/**
 * ===================================================================
 * CORE ENUMS AND CONSTANTS
 * ===================================================================
 */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type StaffRole = "staff" | "manager" | "admin";
export type OrderType = "pickup" | "delivery";

// Enhanced topping amount with proper ordering
export type ToppingAmount = "none" | "light" | "normal" | "extra" | "xxtra";

// Item categories for the new system
export type ItemCategory =
  | "pizza"
  | "chicken"
  | "sandwich"
  | "appetizer"
  | "pasta"
  | "salad"
  | "beverage"
  | "dessert"
  | "side";

// Customization complexity levels
export type CustomizationLevel =
  | "full" // Pizza: size, crust, toppings, modifiers
  | "variants" // Sandwiches: size + limited customization
  | "simple" // Beverages: size selection only
  | "none"; // Sides: add directly to cart

/**
 * ===================================================================
 * NEW CUSTOMIZATION SYSTEM TYPES
 * ===================================================================
 */

/**
 * Customization categories - matches database enum
 */
export type CustomizationCategory =
  | "topping_normal" // Pepperoni, Sausage, Mushrooms, etc.
  | "topping_premium" // Chicken, Meatballs - 2x normal pricing
  | "topping_beef" // Italian Beef - 3x normal pricing
  | "topping_cheese" // Extra Mozzarella, Feta
  | "topping_sauce" // BBQ Sauce, Alfredo, No Sauce, etc.
  | "white_meat" // Chicken white meat upgrades
  | "sides" // Included/optional sides
  | "preparation" // Well Done, Cut in Half, etc.
  | "condiments"; // Hot Sauce, Ranch, etc.

/**
 * Pricing type enum
 */
export type PricingType = "fixed" | "multiplied" | "tiered";

/**
 * Pricing rules structure for customizations
 */
export interface CustomizationPricingRules {
  // For pizza toppings - price varies by size
  size_multipliers?: Record<string, number>;

  // For tier-based pricing (normal/extra/xxtra)
  tier_multipliers?: Record<string, number>;

  // For chicken white meat - base price varies by variant
  variant_base_prices?: Record<string, number>;

  // Any additional rules can be added here
  [key: string]: unknown;
}

/**
 * Main customization interface - represents unified customizations table
 */
export interface Customization {
  id: string;
  restaurant_id: string;
  name: string;
  category: CustomizationCategory;
  base_price: number;
  price_type: PricingType;
  pricing_rules: CustomizationPricingRules;
  applies_to: ItemCategory[];
  sort_order: number;
  is_available: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database response type for customizations
 */
export type CustomizationFromDB = Customization;

/**
 * ===================================================================
 * BASIC DATABASE INTERFACES
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

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  description?: string;
  base_price: number;
  prep_time_minutes: number;
  is_available: boolean;
  item_type: string;
  allows_custom_toppings: boolean;
  default_toppings_json?: unknown;
  image_url?: string;
  variants?: MenuItemVariant[];
  created_at: string;
  updated_at: string;
}

export interface MenuItemVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  serves?: string;
  crust_type?: string;
  sort_order: number;
  is_available: boolean;
  prep_time_minutes: number;
  size_code: string;
}

/**
 * Legacy interfaces for backward compatibility
 * These will eventually be phased out in favor of Customization
 */
export interface Topping {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  sort_order: number;
  is_available: boolean;
  created_at: string;
  is_premium: boolean;
  base_price: number;
}

export interface Modifier {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  price_adjustment: number;
  is_available: boolean;
  created_at: string;
  selected: boolean; // UI state
}

/**
 * ===================================================================
 * CONFIGURED ITEM INTERFACES (For Cart/Orders)
 * ===================================================================
 */

export interface ConfiguredTopping {
  id: string;
  name: string;
  amount: ToppingAmount;
  price: number;
  isDefault: boolean;
  category?: string;
}

export interface ConfiguredModifier {
  id: string;
  name: string;
  priceAdjustment: number;
}

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
 * ===================================================================
 * CUSTOMER & ORDER MANAGEMENT
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
  last_order_date?: string;
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
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  selected_toppings_json?: unknown;
  selected_modifiers_json?: unknown;
  special_instructions?: string;
  created_at: string;
}

/**
 * ===================================================================
 * ENHANCED TYPES FOR FRONTEND USE
 * ===================================================================
 */

export type MenuItemWithCategory = MenuItem & {
  category?: MenuCategory;
};

export type MenuItemWithVariants = MenuItem & {
  category?: MenuCategory;
  variants: MenuItemVariant[];
};

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

/**
 * ===================================================================
 * API REQUEST/RESPONSE TYPES
 * ===================================================================
 */

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ToppingSelection {
  id: string;
  amount: ToppingAmount;
}

export interface PriceCalculationRequest {
  variantId: string;
  toppingSelections?: ToppingSelection[];
  modifierIds?: string[];
}

export interface PriceBreakdownItem {
  name: string;
  price: number;
  amount?: string;
}

export interface PriceCalculationResponse {
  basePrice: number;
  baseName: string;
  toppingCost: number;
  modifierCost: number;
  finalPrice: number;
  breakdown: {
    base: PriceBreakdownItem;
    toppings: PriceBreakdownItem[];
    modifiers: PriceBreakdownItem[];
  };
}

export interface FullMenuResponse {
  menu_items: MenuItemWithVariants[];
  toppings: Topping[]; // Legacy format for compatibility
  modifiers: Modifier[]; // Legacy format for compatibility
  customizations: Customization[]; // New unified customizations
}

export interface CustomerLookupResponse {
  customer: Customer | null;
  addresses?: CustomerAddress[];
}

export interface OrderSummary {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
}

/**
 * ===================================================================
 * CUSTOMIZER-SPECIFIC INTERFACES
 * ===================================================================
 */

// Base interface for all customizers
export interface BaseCustomizerProps {
  item: MenuItemWithVariants;
  existingCartItem?: ConfiguredCartItem;
  onComplete: (cartItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

// Pizza customizer specific types
export interface PizzaToppingConfiguration {
  id: string;
  name: string;
  category: CustomizationCategory;
  amount: ToppingAmount;
  price: number;
  basePrice: number;
  isDefault: boolean;
  isPremium: boolean;
}

export interface PizzaModifierConfiguration {
  id: string;
  name: string;
  category: CustomizationCategory;
  priceAdjustment: number;
  selected: boolean;
}

export interface PizzaCustomizerProps extends BaseCustomizerProps {
  selectedVariant?: MenuItemVariant;
  availableCustomizations: Customization[];
}

// Chicken customizer specific types
export interface ChickenWhiteMeatTier {
  id: string;
  name: string;
  level: "none" | "normal" | "extra" | "xxtra";
  multiplier: number;
  basePrice: number;
}

export interface ChickenCustomizerProps extends BaseCustomizerProps {
  selectedVariant?: MenuItemVariant;
  availableCustomizations: Customization[];
}

// Sandwich customizer types
export type SandwichCustomizerProps = BaseCustomizerProps;

/**
 * ===================================================================
 * INSERT TYPES FOR FORMS
 * ===================================================================
 */

export type InsertOrder = Omit<Order, "id" | "created_at" | "updated_at">;
export type InsertOrderItem = Omit<OrderItem, "id" | "created_at">;
export type InsertCustomer = Omit<Customer, "id" | "created_at" | "updated_at">;
export type InsertCustomerAddress = Omit<CustomerAddress, "id" | "created_at">;
export type InsertStaff = Omit<Staff, "id" | "created_at">;
export type InsertMenuItem = Omit<MenuItem, "id" | "created_at" | "updated_at">;
export type InsertMenuItemVariant = Omit<MenuItemVariant, "id">;
export type InsertCustomization = Omit<
  Customization,
  "id" | "created_at" | "updated_at"
>;

export type SafeString = string | null | undefined;

/**
 * ===================================================================
 * UTILITY FUNCTIONS
 * ===================================================================
 */

export function isCustomizableItem(item: MenuItem): boolean {
  return item.allows_custom_toppings === true;
}

export function isPizzaItem(item: MenuItem): boolean {
  return item.item_type === "pizza";
}

export function safeString(
  value: SafeString,
  defaultValue: string = ""
): string {
  return value ?? defaultValue;
}

export function safeOptionalString(value: SafeString): string | undefined {
  return value === null ? undefined : value ?? undefined;
}

export function getItemCustomizationLevel(item: MenuItem): CustomizationLevel {
  if (item.item_type === "pizza" || item.allows_custom_toppings) {
    return "full";
  }
  if (item.variants && item.variants.length > 1) {
    return "variants";
  }
  if (item.variants && item.variants.length === 1) {
    return "simple";
  }
  return "none";
}

export function getItemCategory(item: MenuItem): ItemCategory {
  const itemType = item.item_type?.toLowerCase() || "";

  if (itemType.includes("pizza")) return "pizza";
  if (itemType.includes("chicken")) return "chicken";
  if (itemType.includes("sandwich") || itemType.includes("sub"))
    return "sandwich";
  if (itemType.includes("appetizer") || itemType.includes("app"))
    return "appetizer";
  if (itemType.includes("pasta")) return "pasta";
  if (itemType.includes("salad")) return "salad";
  if (itemType.includes("side")) return "side";
  if (itemType.includes("beverage") || itemType.includes("drink"))
    return "beverage";
  if (itemType.includes("dessert")) return "dessert";

  // Default categorization by name patterns
  const name = item.name?.toLowerCase() || "";
  if (name.includes("pizza")) return "pizza";
  if (name.includes("chicken")) return "chicken";
  if (name.includes("wing") || name.includes("bread")) return "appetizer";
  if (name.includes("soda") || name.includes("water")) return "beverage";

  return "side";
}

export function shouldShowCustomizer(item: MenuItem): boolean {
  const level = getItemCustomizationLevel(item);
  return level === "full";
}

export function needsVariantSelection(item: MenuItem): boolean {
  const level = getItemCustomizationLevel(item);
  return level === "variants" || level === "simple";
}

/**
 * NEW: Customization utility functions
 */
export function filterCustomizationsByCategory(
  customizations: Customization[],
  category: CustomizationCategory
): Customization[] {
  return customizations.filter((c) => c.category === category);
}

export function filterCustomizationsByAppliesTo(
  customizations: Customization[],
  itemCategory: ItemCategory
): Customization[] {
  return customizations.filter((c) => c.applies_to.includes(itemCategory));
}

export function getPizzaToppingsFromCustomizations(
  customizations: Customization[]
): Customization[] {
  return customizations.filter(
    (c) => c.category.startsWith("topping_") && c.applies_to.includes("pizza")
  );
}

export function getPizzaModifiersFromCustomizations(
  customizations: Customization[]
): Customization[] {
  return customizations.filter(
    (c) => !c.category.startsWith("topping_") && c.applies_to.includes("pizza")
  );
}

/**
 * ===================================================================
 * CONSTANTS
 * ===================================================================
 */

export const DEFAULT_PREP_TIME = 25; // minutes
export const DEFAULT_TAX_RATE = 0.08; // 8%
export const DEFAULT_DELIVERY_FEE = 3.99;

// Pizza size multipliers (based on your actual data)
export const PIZZA_SIZE_MULTIPLIERS: Record<string, number> = {
  small: 0.865, // 10"
  medium: 1.0, // 12" - reference
  large: 1.135, // 14"
  xlarge: 1.351, // 16"
};

// Tier multipliers for toppings
export const PIZZA_TIER_MULTIPLIERS = {
  normal: { normal: 1.0, extra: 2.0, xxtra: 3.0 },
  premium: { normal: 1.0, extra: 1.5, xxtra: 2.0 },
  beef: { normal: 1.0, extra: 1.5, xxtra: 2.0 },
};

// Form data interfaces
export interface CreateStaffFormData {
  name: string;
  email: string;
  role: StaffRole;
  password: string;
  restaurant_id: string;
}

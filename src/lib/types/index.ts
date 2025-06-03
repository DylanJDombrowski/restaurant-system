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

/**
 * ===================================================================
 * ENHANCED PIZZA SYSTEM TYPES
 * ===================================================================
 */

/**
 * Pizza-specific crust pricing from the database
 */
export interface CrustPricing {
  id: string;
  restaurant_id: string;
  size_code: string; // "10in", "12in", "14in", "16in"
  crust_type: string; // "thin", "double_dough", "stuffed", "gluten_free"
  base_price: number;
  upcharge: number;
  is_available: boolean;
}

/**
 * Pizza customization from the unified customizations table
 */
export interface PizzaCustomization {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  base_price: number;
  price_type: "fixed" | "multiplied" | "tiered";
  pricing_rules: {
    size_multipliers?: Record<string, number>;
    tier_multipliers?: Record<string, number>;
  };
  applies_to: string[];
  sort_order: number;
  is_available: boolean;
  description?: string;
}

/**
 * Pizza template for specialty pizzas
 */
export interface PizzaTemplate {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  markup_type: string;
  credit_limit_percentage: number;
  is_active: boolean;
  template_toppings?: PizzaTemplateTopping[];
}

/**
 * Template topping configuration
 */
export interface PizzaTemplateTopping {
  id: string;
  template_id: string;
  customization_id: string;
  customization_name: string;
  default_amount: string;
  is_removable: boolean;
  substitution_tier: string;
  sort_order: number;
}

/**
 * Enhanced menu item variant with crust pricing integration
 */
export interface PizzaMenuItemVariant extends MenuItemVariant {
  base_price_from_crust?: number;
  crust_upcharge?: number;
}

/**
 * Enhanced pizza menu item with templates and crust data
 */
export interface PizzaMenuItem extends MenuItemWithVariants {
  variants: PizzaMenuItemVariant[];
  pizza_template?: PizzaTemplate;
}

/**
 * Complete pizza menu response from /api/menu/pizza
 */
export interface PizzaMenuResponse {
  pizza_items: PizzaMenuItem[];
  crust_pricing: CrustPricing[];
  pizza_customizations: PizzaCustomization[];
  pizza_templates: PizzaTemplate[];
  available_sizes: string[];
  available_crusts: string[];
}

/**
 * Pizza pricing calculation request
 */
export interface PizzaPriceCalculationRequest {
  restaurantId: string;
  sizeCode: string;
  crustType: string;
  toppingSelections?: {
    id: string;
    amount: "light" | "normal" | "extra" | "xxtra";
  }[];
  templateId?: string;
}

/**
 * Price breakdown item from database function
 */
export interface PizzaPriceBreakdownItem {
  name: string;
  price: number;
  type: "base" | "crust" | "topping" | "modifier";
  amount?: string;
  category?: string;
  is_default?: boolean;
}

/**
 * Pizza pricing calculation response
 */
export interface PizzaPriceCalculationResponse {
  basePrice: number;
  crustUpcharge: number;
  toppingCost: number;
  substitutionCredit: number;
  finalPrice: number;
  breakdown: PizzaPriceBreakdownItem[];
  sizeCode: string;
  crustType: string;
  estimatedPrepTime?: number;
  warnings?: string[];
}

/**
 * Enhanced pizza customizer props
 */
export interface EnhancedPizzaCustomizerProps {
  item: ConfiguredCartItem;
  menuItemWithVariants?: PizzaMenuItem; // Now includes crust data
  availableToppings: Topping[]; // Legacy compatibility
  availableModifiers: Modifier[]; // Legacy compatibility
  pizzaMenuData?: PizzaMenuResponse; // NEW: Complete pizza data
  onComplete: (updatedItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: string;
}

/**
 * Crust selection state
 */
export interface CrustSelection {
  sizeCode: string;
  crustType: string;
  basePrice: number;
  upcharge: number;
  displayName: string;
}

/**
 * Pizza configuration state for the customizer
 */
export interface PizzaConfiguration {
  selectedCrust: CrustSelection | null;
  selectedToppings: Map<
    string,
    {
      customization: PizzaCustomization;
      amount: ToppingAmount;
      calculatedPrice: number;
    }
  >;
  selectedModifiers: Set<string>;
  specialInstructions: string;
  isSpecialtyPizza: boolean;
  templateId?: string;
}

/**
 * Pizza customizer state management
 */
export interface PizzaCustomizerState {
  configuration: PizzaConfiguration;
  currentPrice: PizzaPriceCalculationResponse | null;
  isCalculatingPrice: boolean;
  pricingError: string | null;
  availableCrusts: CrustPricing[];
  availableSizes: string[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Enhanced configured cart item for pizzas
 */
export interface EnhancedPizzaCartItem extends ConfiguredCartItem {
  // Crust information
  crustSelection?: CrustSelection;

  // Template information (for specialty pizzas)
  templateId?: string;
  templateName?: string;
  isSpecialtyPizza?: boolean;

  // Enhanced pricing breakdown
  pricingBreakdown?: PizzaPriceBreakdownItem[];
  estimatedPrepTime?: number;
  warnings?: string[];

  // Database-driven pricing
  isDatabasePriced: boolean;
  lastPriceCalculation?: string; // ISO timestamp
}

/**
 * Pizza customizer hooks
 */
export interface UsePizzaMenuOptions {
  restaurantId: string;
  enabled?: boolean;
}

export interface UsePizzaMenuReturn {
  data: PizzaMenuResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UsePizzaPricingOptions {
  restaurantId: string;
  debounceMs?: number;
}

export interface UsePizzaPricingReturn {
  calculatePrice: (
    request: PizzaPriceCalculationRequest
  ) => Promise<PizzaPriceCalculationResponse>;
  currentPrice: PizzaPriceCalculationResponse | null;
  isCalculating: boolean;
  error: string | null;
  lastCalculation: Date | null;
}

/**
 * API Response wrappers
 */
export type PizzaMenuApiResponse = ApiResponse<PizzaMenuResponse>;
export type PizzaPricingApiResponse =
  ApiResponse<PizzaPriceCalculationResponse>;

/**
 * Utility types for pizza system
 */
export type PizzaSize = "10in" | "12in" | "14in" | "16in";
export type PizzaCrustType =
  | "thin"
  | "double_dough"
  | "stuffed"
  | "gluten_free";
export type PizzaToppingCategory =
  | "topping_normal"
  | "topping_premium"
  | "topping_beef"
  | "topping_cheese"
  | "topping_sauce";

/**
 * Pizza customization complexity levels
 */
export type PizzaComplexity = "simple" | "moderate" | "complex" | "specialty";

/**
 * Helper functions (can be implemented in utils)
 */
export interface PizzaUtils {
  getCrustDisplayName: (
    crustType: PizzaCrustType,
    sizeCode: PizzaSize
  ) => string;
  getSizeDisplayName: (sizeCode: PizzaSize) => string;
  getToppingCategoryIcon: (category: string) => string;
  calculateComplexity: (
    toppingCount: number,
    isSpecialty: boolean
  ) => PizzaComplexity;
  formatPrepTime: (minutes: number) => string;
  validatePizzaConfiguration: (config: PizzaConfiguration) => {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * Pizza menu response from enhanced API
 */
export interface PizzaMenuResponse {
  pizza_items: PizzaMenuItem[];
  crust_pricing: CrustPricing[];
  pizza_customizations: PizzaCustomization[];
  pizza_templates: PizzaTemplate[];
  available_sizes: string[];
  available_crusts: string[];
}

/**
 * Pizza price calculation response
 */
export interface PizzaPriceCalculationResponse {
  basePrice: number;
  crustUpcharge: number;
  toppingCost: number;
  substitutionCredit: number;
  finalPrice: number;
  breakdown: PizzaPriceBreakdownItem[];
  sizeCode: string;
  crustType: string;
  estimatedPrepTime?: number;
  warnings?: string[];
}

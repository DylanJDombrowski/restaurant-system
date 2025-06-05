// ===================================================================
// CORE PRIMITIVES & ENUMS
// ===================================================================
export type {
  ID,
  Timestamp,
  OrderStatus,
  StaffRole,
  OrderType,
  ToppingAmount,
} from "./core";

// ===================================================================
// RESTAURANT MANAGEMENT
// ===================================================================
export type { Restaurant, Staff } from "./restaurant";

// ===================================================================
// MENU SYSTEM
// ===================================================================
export type {
  MenuCategory,
  MenuItem,
  MenuItemVariant,
  MenuItemWithCategory,
  MenuItemWithVariants,
} from "./menu";

// ===================================================================
// NEW UNIFIED CUSTOMIZATION SYSTEM
// ===================================================================
export type {
  CustomizationCategory,
  PricingType,
  CustomizationPricingRules,
  Customization,
} from "./customization";

// ===================================================================
// PIZZA-SPECIFIC TYPES
// ===================================================================
export type {
  CrustPricing,
  PizzaTemplate,
  PizzaTemplateTopping,
  PizzaMenuItem,
  PizzaMenuResponse,
  PizzaPriceCalculationRequest,
  PizzaPriceBreakdownItem,
  PizzaPriceCalculationResponse,
} from "./pizza";

// ===================================================================
// CART & ORDER ITEMS
// ===================================================================
export type {
  ConfiguredTopping,
  ConfiguredModifier,
  ConfiguredCartItem,
} from "./cart";

// ===================================================================
// ORDER MANAGEMENT
// ===================================================================
export type {
  Customer,
  CustomerAddress,
  Order,
  OrderItem,
  OrderItemWithDetails,
  OrderWithItems,
  CustomerWithStats,
} from "./orders";

// ===================================================================
// API TYPES
// ===================================================================
export type { ApiResponse, ApiMetadata, PaginatedResponse } from "./api";

// ===================================================================
// CUSTOMIZER COMPONENT TYPES
// ===================================================================
export type {
  BaseCustomizerProps,
  PizzaCustomizerProps,
  ChickenCustomizerProps,
} from "./customizers";

// ===================================================================
// FORM DATA TYPES
// ===================================================================
export type {
  InsertOrder,
  InsertOrderItem,
  InsertCustomer,
  InsertCustomerAddress,
  InsertStaff,
  InsertMenuItem,
  InsertMenuItemVariant,
  InsertCustomization,
} from "./forms";

// ===================================================================
// CONSTANTS
// ===================================================================
export {
  DEFAULT_PREP_TIME,
  DEFAULT_TAX_RATE,
  DEFAULT_DELIVERY_FEE,
  PIZZA_SIZE_MULTIPLIERS,
  PIZZA_TIER_MULTIPLIERS,
} from "./constants";

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================
export {
  type SafeString,
  safeString,
  safeOptionalString,
  isPizzaItem,
  isCustomizableItem,
  shouldShowCustomizer,
  needsVariantSelection,
  getSizeDisplayName,
  getCrustDisplayName,
} from "./utils";

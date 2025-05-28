// src/app/api/menu/pizza/route.ts - FIXED TypeScript Types
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";

// ===================================================================
// DATABASE RESPONSE TYPES - Exact matches for Supabase responses
// ===================================================================

interface MenuCategoryFromDB {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

interface MenuItemVariantFromDB {
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

interface MenuItemFromDB {
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
  image_url?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: MenuCategoryFromDB | null;
  variants?: MenuItemVariantFromDB[];
}

interface CrustPricingFromDB {
  id: string;
  restaurant_id: string;
  size_code: string;
  crust_type: string;
  base_price: number;
  upcharge: number;
  is_available: boolean;
  created_at: string;
}

interface CustomizationFromDB {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  base_price: number;
  price_type: "fixed" | "multiplied" | "tiered";
  pricing_rules: {
    size_multipliers?: Record<string, number>;
    tier_multipliers?: Record<string, number>;
    variant_base_prices?: Record<string, number>;
  };
  applies_to: string[];
  sort_order: number;
  is_available: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface PizzaTemplateFromDB {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  markup_type: string;
  credit_limit_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface PizzaTemplateToppingFromDB {
  id: string;
  template_id: string;
  customization_id: string;
  default_amount: string;
  is_removable: boolean;
  substitution_tier: string;
  sort_order: number;
  customization?: CustomizationFromDB;
}

// ===================================================================
// API RESPONSE TYPES - What we send to the frontend
// ===================================================================

interface CrustPricing {
  id: string;
  restaurant_id: string;
  size_code: string;
  crust_type: string;
  base_price: number;
  upcharge: number;
  is_available: boolean;
}

interface PizzaCustomization {
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

interface PizzaTemplateTopping {
  id: string;
  customization_id: string;
  customization_name: string;
  default_amount: string;
  is_removable: boolean;
  substitution_tier: string;
  sort_order: number;
}

interface PizzaTemplate {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  markup_type: string;
  credit_limit_percentage: number;
  is_active: boolean;
  template_toppings: PizzaTemplateTopping[];
}

interface PizzaMenuItemVariant {
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
  // Enhanced with crust pricing data
  base_price_from_crust?: number;
  crust_upcharge?: number;
}

interface PizzaMenuItem {
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
  image_url?: string;
  category?: {
    id: string;
    name: string;
    sort_order: number;
  };
  // Enhanced variants with crust pricing
  variants: PizzaMenuItemVariant[];
  // Available pizza template if this is a specialty pizza
  pizza_template?: PizzaTemplate;
}

interface PizzaMenuResponse {
  pizza_items: PizzaMenuItem[];
  crust_pricing: CrustPricing[];
  pizza_customizations: PizzaCustomization[];
  pizza_templates: PizzaTemplate[];
  available_sizes: string[];
  available_crusts: string[];
}

// ===================================================================
// MAIN API HANDLER
// ===================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PizzaMenuResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    console.log("🍕 Loading pizza menu data for restaurant:", restaurantId);

    // Step 1: Get all crust pricing data
    const { data: crustPricingData, error: crustError } = await supabaseServer
      .from("crust_pricing")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("size_code")
      .order("crust_type");

    if (crustError) {
      console.error("Error loading crust pricing:", crustError);
      return NextResponse.json(
        { error: "Failed to load crust pricing" },
        { status: 500 }
      );
    }

    const crustPricing = (crustPricingData as CrustPricingFromDB[]) || [];

    // Step 2: Get pizza customizations (toppings and modifiers)
    const { data: customizationsData, error: customizationsError } =
      await supabaseServer
        .from("customizations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .contains("applies_to", ["pizza"])
        .eq("is_available", true)
        .order("category")
        .order("sort_order")
        .order("name");

    if (customizationsError) {
      console.error("Error loading pizza customizations:", customizationsError);
      return NextResponse.json(
        { error: "Failed to load pizza customizations" },
        { status: 500 }
      );
    }

    const customizations = (customizationsData as CustomizationFromDB[]) || [];

    // Step 3: Get pizza menu items with variants
    const { data: menuItemsData, error: menuError } = await supabaseServer
      .from("menu_items")
      .select(
        `
        *,
        category:menu_categories(*),
        variants:menu_item_variants(*)
      `
      )
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .or("item_type.eq.pizza,allows_custom_toppings.eq.true")
      .order("name");

    if (menuError) {
      console.error("Error loading pizza menu items:", menuError);
      return NextResponse.json(
        { error: "Failed to load pizza menu items" },
        { status: 500 }
      );
    }

    const menuItems = (menuItemsData as MenuItemFromDB[]) || [];

    // Step 4: Get pizza templates (try database function first, fallback to manual)
    let templates: PizzaTemplateFromDB[] = [];

    try {
      const { data: templatesData, error: templatesError } =
        await supabaseServer.rpc("get_pizza_templates_with_toppings", {
          p_restaurant_id: restaurantId,
        });

      if (!templatesError && templatesData) {
        templates = templatesData as PizzaTemplateFromDB[];
      } else {
        console.warn(
          "Database function not available, using fallback:",
          templatesError
        );
        templates = await getPizzaTemplatesWithToppings(restaurantId);
      }
    } catch (error) {
      console.warn("Error with pizza templates, using fallback:", error);
      templates = await getPizzaTemplatesWithToppings(restaurantId);
    }

    // Step 5: Process and enhance the data
    const processedPizzaItems: PizzaMenuItem[] = menuItems.map((item) => {
      // Enhanced variants with crust pricing integration
      const enhancedVariants: PizzaMenuItemVariant[] = (
        item.variants || []
      ).map((variant) => {
        // Find matching crust pricing for this variant
        const crustData = crustPricing.find(
          (cp) =>
            cp.size_code === variant.size_code &&
            cp.crust_type === variant.crust_type
        );

        return {
          ...variant,
          base_price_from_crust: crustData?.base_price || variant.price,
          crust_upcharge: crustData?.upcharge || 0,
        };
      });

      // Find pizza template if this is a specialty pizza
      const pizzaTemplate = templates.find((t) => t.menu_item_id === item.id);

      return {
        ...item,
        category: item.category
          ? {
              id: item.category.id,
              name: item.category.name,
              sort_order: item.category.sort_order,
            }
          : undefined,
        variants: enhancedVariants.sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        ),
        pizza_template: pizzaTemplate
          ? transformTemplate(pizzaTemplate)
          : undefined,
      };
    });

    // Step 6: Generate metadata for UI
    const availableSizes = [
      ...new Set(crustPricing.map((cp) => cp.size_code)),
    ].sort();

    const availableCrusts = [
      ...new Set(crustPricing.map((cp) => cp.crust_type)),
    ].sort();

    const response: PizzaMenuResponse = {
      pizza_items: processedPizzaItems,
      crust_pricing: crustPricing.map(transformCrustPricing),
      pizza_customizations: customizations.map(transformCustomization),
      pizza_templates: templates.map(transformTemplate),
      available_sizes: availableSizes,
      available_crusts: availableCrusts,
    };

    console.log("✅ Pizza menu loaded successfully:", {
      items: response.pizza_items.length,
      crusts: response.crust_pricing.length,
      customizations: response.pizza_customizations.length,
      templates: response.pizza_templates.length,
    });

    return NextResponse.json({
      data: response,
      message: "Pizza menu loaded successfully",
    });
  } catch (error) {
    console.error("Error loading pizza menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===================================================================
// HELPER FUNCTIONS WITH PROPER TYPES
// ===================================================================

function transformCrustPricing(dbItem: CrustPricingFromDB): CrustPricing {
  return {
    id: dbItem.id,
    restaurant_id: dbItem.restaurant_id,
    size_code: dbItem.size_code,
    crust_type: dbItem.crust_type,
    base_price: dbItem.base_price,
    upcharge: dbItem.upcharge,
    is_available: dbItem.is_available,
  };
}

function transformCustomization(
  dbItem: CustomizationFromDB
): PizzaCustomization {
  return {
    id: dbItem.id,
    restaurant_id: dbItem.restaurant_id,
    name: dbItem.name,
    category: dbItem.category,
    base_price: dbItem.base_price,
    price_type: dbItem.price_type,
    pricing_rules: {
      size_multipliers: dbItem.pricing_rules.size_multipliers,
      tier_multipliers: dbItem.pricing_rules.tier_multipliers,
    },
    applies_to: dbItem.applies_to,
    sort_order: dbItem.sort_order,
    is_available: dbItem.is_available,
    description: dbItem.description,
  };
}

function transformTemplate(
  dbItem: PizzaTemplateFromDB & {
    template_toppings?: PizzaTemplateToppingFromDB[];
  }
): PizzaTemplate {
  return {
    id: dbItem.id,
    restaurant_id: dbItem.restaurant_id,
    menu_item_id: dbItem.menu_item_id,
    name: dbItem.name,
    markup_type: dbItem.markup_type,
    credit_limit_percentage: dbItem.credit_limit_percentage,
    is_active: dbItem.is_active,
    template_toppings: (dbItem.template_toppings || []).map(
      transformTemplateTopping
    ),
  };
}

function transformTemplateTopping(
  dbItem: PizzaTemplateToppingFromDB
): PizzaTemplateTopping {
  return {
    id: dbItem.id,
    customization_id: dbItem.customization_id,
    customization_name: dbItem.customization?.name || "Unknown Topping",
    default_amount: dbItem.default_amount,
    is_removable: dbItem.is_removable,
    substitution_tier: dbItem.substitution_tier,
    sort_order: dbItem.sort_order,
  };
}

// Helper function to get pizza templates manually (fallback)
async function getPizzaTemplatesWithToppings(
  restaurantId: string
): Promise<PizzaTemplateFromDB[]> {
  try {
    const { data: templatesData, error: templatesError } = await supabaseServer
      .from("pizza_templates")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true);

    if (templatesError || !templatesData) {
      console.warn("No pizza templates found or error:", templatesError);
      return [];
    }

    // Get template toppings for each template
    const templatesWithToppings = await Promise.all(
      templatesData.map(async (template: PizzaTemplateFromDB) => {
        const { data: toppingsData, error: toppingsError } =
          await supabaseServer
            .from("pizza_template_toppings")
            .select(
              `
            *,
            customization:customizations(
              id, name, category, base_price, pricing_rules
            )
          `
            )
            .eq("template_id", template.id)
            .order("sort_order");

        const template_toppings = toppingsError
          ? []
          : (toppingsData as PizzaTemplateToppingFromDB[]) || [];

        return {
          ...template,
          template_toppings,
        };
      })
    );

    return templatesWithToppings;
  } catch (error) {
    console.error("Error loading pizza templates:", error);
    return [];
  }
}

// src/app/api/menu/pizza/calculate-price/route.ts - FIXED SPECIALTY VARIANT PRICING
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";

// Size code mapping for variants vs crust_pricing
const SIZE_CODE_MAPPING: Record<string, string> = {
  small: "10in",
  medium: "12in",
  large: "14in",
  xlarge: "16in",
};

interface ToppingSelection {
  customization_id: string;
  amount: "light" | "normal" | "extra" | "xxtra";
}

interface PriceCalculationRequest {
  restaurant_id: string;
  menu_item_id: string;
  size_code: string; // "small", "medium", "large", "xlarge"
  crust_type: string;
  toppings?: ToppingSelection[];
}

interface PriceBreakdownItem {
  name: string;
  price: number;
  type:
    | "specialty_base"
    | "regular_base"
    | "crust"
    | "topping"
    | "template_default"
    | "template_extra";
  amount?: string;
  category?: string;
  is_default?: boolean;
  calculation_note?: string;
}

interface PriceCalculationResponse {
  basePrice: number;
  basePriceSource: "specialty" | "regular";
  crustUpcharge: number;
  toppingCost: number;
  substitutionCredit: number;
  finalPrice: number;
  breakdown: PriceBreakdownItem[];
  sizeCode: string;
  crustType: string;
  estimatedPrepTime: number;
  warnings?: string[];
  template_info?: {
    name: string;
    included_toppings: string[];
    pricing_note: string;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PriceCalculationResponse>>> {
  try {
    const body: PriceCalculationRequest = await request.json();
    const {
      restaurant_id,
      menu_item_id,
      size_code,
      crust_type,
      toppings = [],
    } = body;

    if (!restaurant_id || !menu_item_id || !size_code || !crust_type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: restaurant_id, menu_item_id, size_code, crust_type",
        },
        { status: 400 }
      );
    }

    console.log("🍕 Enhanced pizza pricing calculation:", {
      restaurant_id,
      menu_item_id,
      size_code,
      crust_type,
      toppings: toppings.length,
    });

    // Step 1: Check if this is a specialty pizza (has template)
    const { data: templateData, error: templateError } = await supabaseServer
      .from("pizza_templates")
      .select(
        `
        *,
        template_toppings:pizza_template_toppings(
          customization_id,
          default_amount,
          substitution_tier
        )
      `
      )
      .eq("restaurant_id", restaurant_id)
      .eq("menu_item_id", menu_item_id)
      .eq("is_active", true)
      .maybeSingle();

    const isSpecialtyPizza = !templateError && templateData;
    let basePrice = 0;
    let basePriceSource: "specialty" | "regular" = "regular";

    // Step 2: Get base price (FIXED: Use correct size mapping)
    if (isSpecialtyPizza) {
      // 🎯 FIXED: Convert display size to database size for variant lookup
      const dbSizeCode = SIZE_CODE_MAPPING[size_code] || size_code;

      const { data: variantData, error: variantError } = await supabaseServer
        .from("menu_item_variants")
        .select("price")
        .eq("menu_item_id", menu_item_id)
        .eq("size_code", dbSizeCode) // Use converted size code
        .eq("crust_type", "thin")
        .single();

      if (variantError || !variantData) {
        console.error("❌ Specialty pizza variant not found:", variantError);
        console.log("🔍 Attempting to find variant with details:", {
          menu_item_id,
          size_code,
          dbSizeCode,
          crust_type,
        });

        // Debug: Check what variants exist for this menu item
        const { data: debugVariants } = await supabaseServer
          .from("menu_item_variants")
          .select("*")
          .eq("menu_item_id", menu_item_id);

        console.log("🔍 Available variants for this menu item:", debugVariants);

        return NextResponse.json(
          {
            error: `No specialty pizza variant found for ${dbSizeCode} ${crust_type}. Available variants: ${JSON.stringify(
              debugVariants
            )}`,
          },
          { status: 400 }
        );
      }

      basePrice = variantData.price;
      basePriceSource = "specialty";
      console.log(
        "🎯 Specialty pizza base price:",
        basePrice,
        "for",
        dbSizeCode
      );
    } else {
      // Load regular pizza crust pricing
      const crustSizeCode = SIZE_CODE_MAPPING[size_code] || size_code;
      const { data: crustData, error: crustError } = await supabaseServer
        .from("crust_pricing")
        .select("base_price")
        .eq("restaurant_id", restaurant_id)
        .eq("size_code", crustSizeCode)
        .eq("crust_type", crust_type)
        .eq("is_available", true)
        .single();

      if (crustError || !crustData) {
        console.error("❌ Regular pizza crust pricing not found:", crustError);
        return NextResponse.json(
          { error: `No pricing found for ${crustSizeCode} ${crust_type}` },
          { status: 400 }
        );
      }

      basePrice = crustData.base_price;
      basePriceSource = "regular";
      console.log("🍕 Regular pizza base price:", basePrice);
    }

    // Step 3: Calculate crust upcharge (for specialty pizzas with non-thin crust)
    let crustUpcharge = 0;
    if (isSpecialtyPizza && crust_type !== "thin") {
      const upcharges: Record<string, Record<string, number>> = {
        double_dough: {
          small: 1.1,
          medium: 1.3,
          large: 1.35,
          xlarge: 1.75,
        },
        gluten_free: {
          small: 1.5,
        },
      };

      crustUpcharge = upcharges[crust_type]?.[size_code] || 0;
    }

    // Step 4: Build template defaults map
    interface TemplateTopping {
      customization_id: string;
      default_amount: string;
      substitution_tier: string;
    }
    const templateDefaults = new Map<
      string,
      { amount: string; tier: string }
    >();
    if (isSpecialtyPizza && templateData.template_toppings) {
      (templateData.template_toppings as TemplateTopping[]).forEach((tt) => {
        templateDefaults.set(tt.customization_id, {
          amount: tt.default_amount,
          tier: tt.substitution_tier,
        });
      });
      console.log("📋 Template defaults loaded:", templateDefaults.size);
    }

    // Step 5: Calculate topping costs with CORRECTED template logic
    let toppingCost = 0;
    const toppingBreakdown: PriceBreakdownItem[] = [];
    const warnings: string[] = [];

    if (toppings.length > 0) {
      const toppingIds = toppings.map((t) => t.customization_id);

      const { data: customizationsData, error: customizationsError } =
        await supabaseServer
          .from("customizations")
          .select("*")
          .eq("restaurant_id", restaurant_id)
          .in("id", toppingIds)
          .contains("applies_to", ["pizza"])
          .eq("is_available", true);

      if (customizationsError) {
        console.error("❌ Error loading customizations:", customizationsError);
        return NextResponse.json(
          {
            error: `Failed to load customizations: ${customizationsError.message}`,
          },
          { status: 500 }
        );
      }

      const customizations = customizationsData || [];

      // Calculate pricing for each topping
      toppings.forEach((selection) => {
        const customization = customizations.find(
          (c) => c.id === selection.customization_id
        );
        if (!customization) {
          warnings.push(
            `Customization not found: ${selection.customization_id}`
          );
          return;
        }

        const templateDefault = templateDefaults.get(
          selection.customization_id
        );
        const isTemplateDefault = !!templateDefault;

        let calculatedPrice = 0;
        let itemType: PriceBreakdownItem["type"] = "topping";
        let calculationNote = "";

        if (isTemplateDefault) {
          // 🎯 FIXED: Template topping logic
          if (selection.amount === templateDefault.amount) {
            // Customer selected the default amount - FREE (value already in base price)
            calculatedPrice = 0;
            itemType = "template_default";
            calculationNote = `Default ${selection.amount} included in ${templateData?.name} base price`;
          } else {
            // Customer wants different amount than default - charge as normal topping
            calculatedPrice = calculateToppingPrice(
              customization,
              size_code,
              selection.amount,
              true // isTemplateContext = normal pricing instead of premium
            );
            itemType = "template_extra";
            calculationNote = `Modified from default ${templateDefault.amount} to ${selection.amount}`;
          }
        } else {
          // Additional topping not in template
          calculatedPrice = calculateToppingPrice(
            customization,
            size_code,
            selection.amount,
            isSpecialtyPizza
          );
          itemType = "topping";
          calculationNote = isSpecialtyPizza
            ? `Additional ${selection.amount} topping`
            : `${selection.amount} topping`;
        }

        toppingCost += calculatedPrice;
        toppingBreakdown.push({
          name: customization.name,
          price: calculatedPrice,
          type: itemType,
          amount: selection.amount,
          category: customization.category,
          is_default: isTemplateDefault,
          calculation_note: calculationNote,
        });

        console.log(
          `💰 ${customization.name} (${selection.amount}): $${calculatedPrice} - ${calculationNote}`
        );
      });
    }

    // Step 6: Build final response
    const substitutionCredit = 0; // TODO: Future implementation
    const finalPrice =
      basePrice + crustUpcharge + toppingCost - substitutionCredit;

    const breakdown: PriceBreakdownItem[] = [
      {
        name: isSpecialtyPizza
          ? `${getSizeDisplayName(size_code)} ${
              templateData?.name || "Specialty Pizza"
            }`
          : `${getSizeDisplayName(size_code)} ${getCrustDisplayName(
              crust_type
            )} Pizza`,
        price: basePrice,
        type: isSpecialtyPizza ? "specialty_base" : "regular_base",
        calculation_note: isSpecialtyPizza
          ? `Complete ${templateData?.name} with all default toppings included`
          : "Base pizza price",
      },
    ];

    if (crustUpcharge > 0) {
      breakdown.push({
        name: `${getCrustDisplayName(crust_type)} Crust Upcharge`,
        price: crustUpcharge,
        type: "crust",
      });
    }

    breakdown.push(...toppingBreakdown);

    const response: PriceCalculationResponse = {
      basePrice,
      basePriceSource,
      crustUpcharge,
      toppingCost,
      substitutionCredit,
      finalPrice,
      breakdown,
      sizeCode: size_code,
      crustType: crust_type,
      estimatedPrepTime: calculatePrepTime(toppings.length),
      warnings: warnings.length > 0 ? warnings : undefined,
      template_info: isSpecialtyPizza
        ? {
            name: templateData?.name || "Specialty Pizza",
            included_toppings: Array.from(templateDefaults.keys()),
            pricing_note:
              "All default toppings included in base price. Modifications charged separately.",
          }
        : undefined,
    };

    console.log("✅ Enhanced pricing calculation finished:", {
      finalPrice: response.finalPrice,
      basePriceSource,
      basePrice,
      toppingCost,
      isSpecialty: isSpecialtyPizza,
      breakdownItems: breakdown.length,
    });

    return NextResponse.json({
      data: response,
      message: "Enhanced pizza price calculated successfully",
    });
  } catch (error) {
    console.error("💥 Error in enhanced pizza pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===================================================================
// ENHANCED PRICING CALCULATION FUNCTIONS
// ===================================================================

interface Customization {
  id: string;
  name: string;
  category: string;
  base_price?: number;
  pricing_rules?: {
    size_multipliers?: Record<string, number>;
    tier_multipliers?: Record<string, number>;
  };
}

function calculateToppingPrice(
  customization: Customization,
  sizeCode: string,
  amount: string,
  isTemplateContext: boolean = false
): number {
  try {
    const basePrice = customization.base_price || 0;
    const pricingRules = customization.pricing_rules || {};

    // ✅ SAUCE PRICING: Always FREE
    if (customization.category === "topping_sauce") {
      return 0;
    }

    // Size multipliers (convert display size to calculation size)
    const sizeMultipliers: Record<string, number> = {
      small: 0.865, // 10"
      medium: 1.0, // 12"
      large: 1.135, // 14"
      xlarge: 1.351, // 16"
    };

    // 🎯 TEMPLATE CONTEXT PRICING: Template toppings use normal base price
    let effectiveBasePrice = basePrice;
    let tierMultipliers: Record<string, number>;

    if (isTemplateContext && customization.category === "topping_premium") {
      // 🎯 CHICKEN IN TEMPLATES: Use normal base price ($1.85), not premium ($3.70)
      effectiveBasePrice = 1.85; // Override premium base with normal base
      tierMultipliers = {
        light: 0.5,
        normal: 1.0,
        extra: 1.0, // Extra chicken = $1.85 * 1.0 = $1.85
        xxtra: 2.0, // XXtra chicken = $1.85 * 2.0 = $3.70
      };
    } else {
      // Standard pricing for regular pizzas or non-template items
      const categoryMultipliers: Record<string, Record<string, number>> = {
        topping_normal: { light: 0.5, normal: 1.0, extra: 2.0, xxtra: 3.0 },
        topping_premium: { light: 0.5, normal: 1.0, extra: 1.5, xxtra: 2.0 },
        topping_beef: { light: 0.5, normal: 1.0, extra: 1.5, xxtra: 2.0 },
        topping_cheese: { light: 0.5, normal: 1.0, extra: 2.0, xxtra: 2.0 },
        topping_sauce: { light: 0, normal: 0, extra: 0, xxtra: 0 },
      };

      tierMultipliers = categoryMultipliers[customization.category] || {
        light: 0.5,
        normal: 1.0,
        extra: 2.0,
        xxtra: 3.0,
      };
    }

    // Get multipliers from database or use defaults
    const sizeMultiplier =
      pricingRules.size_multipliers?.[sizeCode] ||
      sizeMultipliers[sizeCode] ||
      1.0;

    const tierMultiplier =
      pricingRules.tier_multipliers?.[amount] || tierMultipliers[amount] || 1.0;

    const calculatedPrice =
      effectiveBasePrice * sizeMultiplier * tierMultiplier;
    return Math.max(0, Math.round(calculatedPrice * 100) / 100);
  } catch (error) {
    console.error("❌ Error calculating topping price:", error, customization);
    return 0;
  }
}

function calculatePrepTime(toppingCount: number): number {
  const basePrepTime = 15;
  const complexityBonus = Math.min(toppingCount * 1.5, 10);
  return Math.round(basePrepTime + complexityBonus);
}

function getSizeDisplayName(sizeCode: string): string {
  const sizeNames: Record<string, string> = {
    small: 'Small 10"',
    medium: 'Medium 12"',
    large: 'Large 14"',
    xlarge: 'X-Large 16"',
  };
  return sizeNames[sizeCode] || sizeCode;
}

function getCrustDisplayName(crustType: string): string {
  const crustNames: Record<string, string> = {
    thin: "Thin Crust",
    double_dough: "Double Dough",
    gluten_free: "Gluten Free",
    stuffed: "Stuffed Crust",
  };
  return crustNames[crustType] || crustType;
}

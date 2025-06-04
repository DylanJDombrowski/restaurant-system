// Enhanced Pricing API with Specialty Pizza Template Logic
// src/app/api/menu/pizza/calculate-price/route.ts - SPECIALTY PIZZA VERSION

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";

interface ToppingSelection {
  customization_id: string;
  amount: "light" | "normal" | "extra" | "xxtra";
  is_template_default?: boolean; // NEW: Track if this is a template default
}

interface PriceCalculationRequest {
  restaurant_id: string;
  size_code: string;
  crust_type: string;
  toppings?: ToppingSelection[];
  template_id?: string; // NEW: For specialty pizza templates
}

interface PriceBreakdownItem {
  name: string;
  price: number;
  type: "base" | "crust" | "topping" | "template_default" | "modifier";
  amount?: string;
  category?: string;
  is_default?: boolean;
}

interface PriceCalculationResponse {
  basePrice: number;
  crustUpcharge: number;
  toppingCost: number;
  substitutionCredit: number; // NEW: Credit for removed template toppings
  finalPrice: number;
  breakdown: PriceBreakdownItem[];
  sizeCode: string;
  crustType: string;
  estimatedPrepTime: number;
  warnings?: string[];
  template_info?: {
    name: string;
    default_toppings: string[];
    credit_applied: number;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PriceCalculationResponse>>> {
  try {
    const body: PriceCalculationRequest = await request.json();
    const {
      restaurant_id,
      size_code,
      crust_type,
      toppings = [],
      template_id,
    } = body;

    if (!restaurant_id || !size_code || !crust_type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: restaurant_id, size_code, crust_type",
        },
        { status: 400 }
      );
    }

    console.log("🍕 Calculating specialty pizza price:", {
      restaurant_id,
      size_code,
      crust_type,
      toppings: toppings.length,
      template_id,
    });

    // Step 1: Get base crust pricing
    const { data: crustData, error: crustError } = await supabaseServer
      .from("crust_pricing")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .eq("size_code", size_code)
      .eq("crust_type", crust_type)
      .eq("is_available", true)
      .single();

    if (crustError || !crustData) {
      console.error("Crust pricing error:", crustError);
      return NextResponse.json(
        { error: `No pricing found for ${size_code} ${crust_type}` },
        { status: 400 }
      );
    }

    // Step 2: Load template data if this is a specialty pizza
    let templateData = null;
    const templateDefaults: Set<string> = new Set();

    if (template_id) {
      const { data: template, error: templateError } = await supabaseServer
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
        .eq("id", template_id)
        .single();

      if (!templateError && template) {
        templateData = template;
        // Build set of template default customization IDs
        interface TemplateTopping {
          customization_id: string;
          default_amount: string;
          substitution_tier: number;
        }
        (template.template_toppings as TemplateTopping[] | undefined)?.forEach(
          (tt) => {
            templateDefaults.add(tt.customization_id);
          }
        );
        console.log(
          "🎯 Template loaded:",
          template.name,
          "with defaults:",
          Array.from(templateDefaults)
        );
      }
    }

    // Step 3: Load customizations for pricing calculations
    let toppingCost = 0;
    const substitutionCredit = 0;
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
            error: `Failed to load topping data: ${customizationsError.message}`,
          },
          { status: 500 }
        );
      }

      const customizations = customizationsData || [];

      // Step 4: Calculate pricing with template logic
      toppings.forEach((selection) => {
        const customization = customizations.find(
          (c) => c.id === selection.customization_id
        );
        if (customization) {
          const isTemplateDefault = templateDefaults.has(
            selection.customization_id
          );

          // 🎯 KEY LOGIC: Template defaults are FREE (included in base price)
          let calculatedPrice = 0;
          let itemType: PriceBreakdownItem["type"] = "topping";

          if (isTemplateDefault) {
            // This is a template default topping - NO CHARGE
            calculatedPrice = 0;
            itemType = "template_default";
            console.log(`🆓 Template default: ${customization.name} = FREE`);
          } else {
            // This is an additional topping - FULL CHARGE
            calculatedPrice = calculateToppingPrice(
              customization,
              size_code,
              selection.amount
            );
            itemType = "topping";
            console.log(
              `💰 Additional topping: ${customization.name} = $${calculatedPrice}`
            );
          }

          toppingCost += calculatedPrice;
          toppingBreakdown.push({
            name: customization.name,
            price: calculatedPrice,
            type: itemType,
            amount: selection.amount,
            category: customization.category,
            is_default: isTemplateDefault,
          });
        } else {
          warnings.push(`Topping not found: ${selection.customization_id}`);
        }
      });
    }

    // Step 5: Calculate substitution credits (for future implementation)
    // TODO: Handle when template toppings are removed/substituted
    // This would give credit for removed defaults up to template.credit_limit_percentage

    // Step 6: Calculate final pricing
    const basePrice = crustData.base_price;
    const crustUpcharge = crustData.upcharge;
    const finalPrice =
      basePrice + crustUpcharge + toppingCost - substitutionCredit;

    const breakdown: PriceBreakdownItem[] = [
      {
        name: `${size_code.toUpperCase()} ${crust_type
          .replace("_", " ")
          .toUpperCase()} Base`,
        price: basePrice,
        type: "base",
      },
    ];

    if (crustUpcharge > 0) {
      breakdown.push({
        name: `${crust_type.replace("_", " ").toUpperCase()} Crust Upcharge`,
        price: crustUpcharge,
        type: "crust",
      });
    }

    // Add template info if specialty pizza
    if (templateData) {
      breakdown.push({
        name: `${templateData.name} - Includes Default Toppings`,
        price: 0,
        type: "template_default",
      });
    }

    breakdown.push(...toppingBreakdown);

    const response: PriceCalculationResponse = {
      basePrice,
      crustUpcharge,
      toppingCost,
      substitutionCredit,
      finalPrice,
      breakdown,
      sizeCode: size_code,
      crustType: crust_type,
      estimatedPrepTime: calculatePrepTime(toppings.length),
      warnings: warnings.length > 0 ? warnings : undefined,
      template_info: templateData
        ? {
            name: templateData.name,
            default_toppings: Array.from(templateDefaults),
            credit_applied: substitutionCredit,
          }
        : undefined,
    };

    console.log("✅ Specialty pizza price calculated:", {
      finalPrice: response.finalPrice,
      isSpecialty: !!templateData,
      templateDefaults: Array.from(templateDefaults).length,
      toppingCost,
      substitutionCredit,
    });

    return NextResponse.json({
      data: response,
      message: "Specialty pizza price calculated successfully",
    });
  } catch (error) {
    console.error("💥 Error calculating specialty pizza price:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Existing helper functions remain the same
interface Customization {
  id: string;
  name: string;
  base_price: number;
  pricing_rules?: {
    size_multipliers?: Record<string, number>;
    tier_multipliers?: Record<string, number>;
  };
  category?: string;
}

function calculateToppingPrice(
  customization: Customization,
  sizeCode: string,
  amount: string
): number {
  try {
    const basePrice = customization.base_price || 0;
    const pricingRules = customization.pricing_rules || {};

    const defaultSizeMultipliers: Record<string, number> = {
      "10in": 0.865,
      "12in": 1.0,
      "14in": 1.135,
      "16in": 1.351,
    };

    const defaultTierMultipliers: Record<string, number> = {
      light: 1.0,
      normal: 1.0,
      extra: 2.0,
      xxtra: 3.0,
    };

    let sizeMultiplier = 1.0;
    if (
      pricingRules.size_multipliers &&
      pricingRules.size_multipliers[sizeCode]
    ) {
      sizeMultiplier = Number(pricingRules.size_multipliers[sizeCode]);
    } else {
      sizeMultiplier = defaultSizeMultipliers[sizeCode] || 1.0;
    }

    let tierMultiplier = 1.0;
    if (
      pricingRules.tier_multipliers &&
      pricingRules.tier_multipliers[amount]
    ) {
      tierMultiplier = Number(pricingRules.tier_multipliers[amount]);
    } else {
      tierMultiplier = defaultTierMultipliers[amount] || 1.0;
    }

    const calculatedPrice = basePrice * sizeMultiplier * tierMultiplier;
    return Math.max(0, Math.round(calculatedPrice * 100) / 100);
  } catch (error) {
    console.error("Error calculating topping price:", error, customization);
    return 0;
  }
}

function calculatePrepTime(toppingCount: number): number {
  const basePrepTime = 15;
  const complexityBonus = Math.min(toppingCount * 1.5, 10);
  return Math.round(basePrepTime + complexityBonus);
}

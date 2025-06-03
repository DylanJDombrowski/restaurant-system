// src/app/api/menu/pizza/calculate-price/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";

interface ToppingSelection {
  customization_id: string;
  amount: "light" | "normal" | "extra" | "xxtra";
}

interface PriceCalculationRequest {
  restaurant_id: string;
  size_code: string;
  crust_type: string;
  toppings?: ToppingSelection[];
  template_id?: string;
}

interface PriceBreakdownItem {
  name: string;
  price: number;
  type: "base" | "crust" | "topping" | "modifier";
  amount?: string;
  category?: string;
  is_default?: boolean;
}

interface PriceCalculationResponse {
  basePrice: number;
  crustUpcharge: number;
  toppingCost: number;
  substitutionCredit: number;
  finalPrice: number;
  breakdown: PriceBreakdownItem[];
  sizeCode: string;
  crustType: string;
  estimatedPrepTime: number;
  warnings?: string[];
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PriceCalculationResponse>>> {
  try {
    const body: PriceCalculationRequest = await request.json();
    const { restaurant_id, size_code, crust_type, toppings = [] } = body;

    if (!restaurant_id || !size_code || !crust_type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: restaurant_id, size_code, crust_type",
        },
        { status: 400 }
      );
    }

    console.log("🍕 Calculating pizza price:", {
      size_code,
      crust_type,
      toppings: toppings.length,
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

    // Step 2: Calculate topping costs manually (since DB function might not exist)
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
          .like("category", "topping_%")
          .eq("is_available", true);

      if (customizationsError) {
        console.error("Error loading toppings:", customizationsError);
        return NextResponse.json(
          { error: "Failed to load topping data" },
          { status: 500 }
        );
      }

      const customizations = customizationsData || [];

      // Calculate prices using the mathematical formulas
      toppings.forEach((selection) => {
        const customization = customizations.find(
          (c) => c.id === selection.customization_id
        );
        if (customization) {
          const calculatedPrice = calculateToppingPrice(
            customization,
            size_code,
            selection.amount
          );

          toppingCost += calculatedPrice;
          toppingBreakdown.push({
            name: customization.name,
            price: calculatedPrice,
            type: "topping",
            amount: selection.amount,
            category: customization.category,
            is_default: false,
          });

          console.log(
            `🧮 ${customization.name} (${selection.amount}): $${calculatedPrice}`
          );
        } else {
          warnings.push(`Topping not found: ${selection.customization_id}`);
        }
      });
    }

    // Step 3: Calculate final pricing
    const basePrice = crustData.base_price;
    const crustUpcharge = crustData.upcharge;
    const finalPrice = basePrice + crustUpcharge + toppingCost;

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

    breakdown.push(...toppingBreakdown);

    const response: PriceCalculationResponse = {
      basePrice,
      crustUpcharge,
      toppingCost,
      substitutionCredit: 0, // TODO: Implement for specialty pizzas
      finalPrice,
      breakdown,
      sizeCode: size_code,
      crustType: crust_type,
      estimatedPrepTime: calculatePrepTime(toppings.length),
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    console.log("✅ Pizza price calculated successfully:", {
      finalPrice: response.finalPrice,
      breakdown: response.breakdown.length,
    });

    return NextResponse.json({
      data: response,
      message: "Price calculated successfully",
    });
  } catch (error) {
    console.error("Error calculating pizza price:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===================================================================
// PRICING CALCULATION FUNCTIONS
// ===================================================================

interface Customization {
  id: string;
  name: string;
  base_price: number;
  pricing_rules?: {
    size_multipliers?: Record<string, number>;
    tier_multipliers?: Record<string, Record<string, number>>;
  };
  category: string;
  is_available: boolean;
}

function calculateToppingPrice(
  customization: Customization,
  sizeCode: string,
  amount: string
): number {
  const basePrice = customization.base_price;
  const pricingRules = customization.pricing_rules || {};

  // Size multipliers for different pizza sizes
  const sizeMultipliers: Record<string, number> = {
    "10in": 0.865, // Small
    "12in": 1.0, // Medium (base)
    "14in": 1.135, // Large
    "16in": 1.351, // X-Large
  };

  // Amount multipliers based on topping category
  const tierMultipliers: Record<string, Record<string, number>> = {
    topping_normal: { light: 0.5, normal: 1.0, extra: 2.0, xxtra: 3.0 },
    topping_premium: { light: 0.5, normal: 1.0, extra: 1.5, xxtra: 2.0 },
    topping_beef: { light: 0.5, normal: 1.0, extra: 1.5, xxtra: 2.0 },
    topping_cheese: { light: 0.5, normal: 1.0, extra: 2.0, xxtra: 3.0 },
    topping_sauce: { light: 0.5, normal: 1.0, extra: 2.0, xxtra: 3.0 },
  };

  // Get multipliers from database rules or use defaults
  const sizeMultiplier =
    pricingRules.size_multipliers?.[sizeCode] ||
    sizeMultipliers[sizeCode] ||
    1.0;

  const tierMultiplier =
    pricingRules.tier_multipliers?.[amount] ||
    tierMultipliers[customization.category]?.[amount] ||
    1.0;

  const calculatedPrice =
    Number(basePrice) * Number(sizeMultiplier) * Number(tierMultiplier);

  // Round to 2 decimal places
  return Math.round(calculatedPrice * 100) / 100;
}

function calculatePrepTime(toppingCount: number): number {
  const basePrepTime = 15; // Base 15 minutes for pizza
  const complexityBonus = Math.min(toppingCount * 1.5, 10); // Up to 10 extra minutes
  return Math.round(basePrepTime + complexityBonus);
}

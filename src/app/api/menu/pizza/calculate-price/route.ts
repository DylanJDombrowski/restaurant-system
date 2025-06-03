// src/app/api/menu/pizza/calculate-price/route.ts
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

    // Use your existing database function
    const { data: pricingResult, error: pricingError } =
      await supabaseServer.rpc("calculate_pizza_price", {
        p_size_code: size_code,
        p_crust_type: crust_type,
        p_toppings: JSON.stringify(toppings),
        p_template_id: body.template_id || null,
        p_restaurant_id: restaurant_id,
      });

    if (pricingError) {
      console.error("Database pricing calculation error:", pricingError);
      return NextResponse.json(
        { error: `Pricing calculation failed: ${pricingError.message}` },
        { status: 500 }
      );
    }

    if (!pricingResult) {
      return NextResponse.json(
        { error: "No pricing data returned from database" },
        { status: 500 }
      );
    }

    // Parse the database function result
    const result =
      typeof pricingResult === "string"
        ? JSON.parse(pricingResult)
        : pricingResult;

    const response: PriceCalculationResponse = {
      basePrice: Number(result.base_price || 0),
      crustUpcharge: Number(result.crust_upcharge || 0),
      toppingCost: Number(result.topping_cost || 0),
      substitutionCredit: Number(result.substitution_credit || 0),
      finalPrice: Number(result.final_price || 0),
      breakdown: result.breakdown || [],
      sizeCode: result.size_code || size_code,
      crustType: result.crust_type || crust_type,
      estimatedPrepTime: calculatePrepTime(toppings.length),
      warnings: result.warnings || [],
    };

    console.log("✅ Pizza price calculated:", {
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

// Helper function to calculate prep time based on complexity
function calculatePrepTime(toppingCount: number): number {
  const basePrepTime = 15; // Base 15 minutes for pizza
  const complexityBonus = Math.min(toppingCount * 2, 10); // Up to 10 extra minutes
  return basePrepTime + complexityBonus;
}

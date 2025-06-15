// src/app/api/menu/pizza/calculate-price/route.ts - CORRECTED VERSION
// SINGLE SOURCE OF TRUTH: Uses only the PostgreSQL function

import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, PizzaPriceCalculationRequest, PizzaPriceCalculationResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

// Size conversion mapping
const SIZE_TO_INCH_MAPPING: Record<string, string> = {
  small: "10in",
  medium: "12in",
  large: "14in",
  xlarge: "16in",
};

// Simple cache to prevent duplicate rapid requests
const calculationCache = new Map<
  string,
  {
    result: PizzaPriceCalculationResponse;
    timestamp: number;
  }
>();
const CACHE_TTL = 3000; // 3 seconds

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<PizzaPriceCalculationResponse>>> {
  try {
    const body: PizzaPriceCalculationRequest = await request.json();
    const { restaurant_id, menu_item_id, size_code, crust_type, toppings = [] } = body;

    if (!restaurant_id || !menu_item_id || !size_code || !crust_type) {
      return NextResponse.json(
        {
          error: "Missing required fields: restaurant_id, menu_item_id, size_code, crust_type",
        },
        { status: 400 }
      );
    }

    // Create cache key
    const cacheKey = JSON.stringify({
      restaurant_id,
      menu_item_id,
      size_code,
      crust_type,
      toppings: toppings.sort((a, b) => a.customization_id.localeCompare(b.customization_id)),
    });

    // Check cache
    const now = Date.now();
    const cached = calculationCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        data: cached.result,
        message: "Pizza price calculated successfully (cached)",
      });
    }

    console.log("🍕 Calculating pizza price:", {
      restaurant_id,
      menu_item_id,
      size_code,
      crust_type,
      toppings: toppings.length,
    });

    // Convert size format for database
    const dbSizeCode = SIZE_TO_INCH_MAPPING[size_code] || size_code;

    // Check if this is a specialty pizza (has template)
    const { data: templateData, error: templateError } = await supabaseServer
      .from("pizza_templates")
      .select("id, name, menu_item_id")
      .eq("restaurant_id", restaurant_id)
      .eq("menu_item_id", menu_item_id)
      .eq("is_active", true)
      .maybeSingle();

    const isSpecialtyPizza = !templateError && templateData;
    const templateId = isSpecialtyPizza ? templateData.id : null;

    // ===================================================================
    // SINGLE SOURCE OF TRUTH: Call PostgreSQL function
    // ===================================================================
    const { data: pricingResult, error: pricingError } = await supabaseServer.rpc("calculate_pizza_price", {
      p_size_code: dbSizeCode,
      p_crust_type: crust_type,
      p_toppings: toppings,
      p_template_id: templateId,
      p_restaurant_id: restaurant_id,
    });

    if (pricingError) {
      console.error("❌ Database pricing calculation failed:", pricingError);
      return NextResponse.json({ error: `Pricing calculation failed: ${pricingError.message}` }, { status: 500 });
    }

    if (!pricingResult) {
      return NextResponse.json({ error: "No pricing result returned from database" }, { status: 500 });
    }

    // Check for database function errors
    if (pricingResult.error) {
      return NextResponse.json({ error: pricingResult.error }, { status: 400 });
    }

    // ===================================================================
    // ENHANCE RESPONSE WITH METADATA
    // ===================================================================
    const response: PizzaPriceCalculationResponse = {
      basePrice: pricingResult.base_price || 0,
      basePriceSource: isSpecialtyPizza ? "specialty" : "regular",
      crustUpcharge: pricingResult.crust_upcharge || 0,
      toppingCost: pricingResult.topping_cost || 0,
      substitutionCredit: 0, // TODO: Future implementation
      finalPrice: pricingResult.final_price || 0,
      breakdown: pricingResult.breakdown || [],
      sizeCode: size_code,
      crustType: crust_type,
      estimatedPrepTime: calculatePrepTime(toppings.length),
      template_info: isSpecialtyPizza
        ? {
            name: templateData.name,
            included_toppings: [], // TODO: Load from template if needed
            pricing_note: "Template toppings included in base price. Modifications charged separately.",
          }
        : undefined,
    };

    // Cache the result
    calculationCache.set(cacheKey, {
      result: response,
      timestamp: now,
    });

    // Clean old cache entries
    for (const [key, value] of calculationCache.entries()) {
      if (now - value.timestamp > CACHE_TTL * 2) {
        calculationCache.delete(key);
      }
    }

    console.log("✅ Database pricing calculation completed:", {
      finalPrice: response.finalPrice,
      basePriceSource: response.basePriceSource,
      toppingCost: response.toppingCost,
      breakdown: response.breakdown.length,
    });

    return NextResponse.json({
      data: response,
      message: "Pizza price calculated successfully",
    });
  } catch (error) {
    console.error("💥 Error in pizza pricing API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function calculatePrepTime(toppingCount: number): number {
  const basePrepTime = 15;
  const complexityBonus = Math.min(toppingCount * 1.5, 10);
  return Math.round(basePrepTime + complexityBonus);
}

// ===================================================================
// CACHE CLEANUP (runs periodically in production)
// ===================================================================
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of calculationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL * 3) {
      calculationCache.delete(key);
    }
  }
}, 30000); // Clean every 30 seconds

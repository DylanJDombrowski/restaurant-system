// src/app/api/menu/chicken/calculate-price/route.ts
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

interface ChickenPriceRequest {
  restaurant_id: string;
  variant_id: string;
  white_meat_tier: "none" | "normal" | "extra" | "xxtra";
  customization_ids: string[];
}

interface ChickenPriceResponse {
  base_price: number;
  white_meat_cost: number;
  customizations_cost: number;
  final_price: number;
  breakdown: ChickenPriceBreakdownItem[];
  estimated_prep_time: number;
}

interface ChickenPriceBreakdownItem {
  name: string;
  price: number;
  type: "base" | "white_meat" | "customization";
  tier?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ChickenPriceResponse>>> {
  try {
    const body: ChickenPriceRequest = await request.json();
    const { restaurant_id, variant_id, white_meat_tier, customization_ids } = body;

    if (!restaurant_id || !variant_id || !white_meat_tier) {
      return NextResponse.json({ error: "Missing required fields: restaurant_id, variant_id, white_meat_tier" }, { status: 400 });
    }

    console.log("🐔 Chicken pricing calculation:", {
      restaurant_id,
      variant_id,
      white_meat_tier,
      customizations: customization_ids.length,
    });

    // Step 1: Get variant details with white meat upcharge
    const { data: variantData, error: variantError } = await supabaseServer
      .from("menu_item_variants")
      .select(
        `
        *,
        menu_item:menu_items(name)
      `
      )
      .eq("id", variant_id)
      .single();

    if (variantError || !variantData) {
      console.error("❌ Variant not found:", variantError);
      return NextResponse.json({ error: "Chicken variant not found" }, { status: 400 });
    }

    const basePrice = variantData.price;
    const whiteMeatUpcharge = variantData.white_meat_upcharge || 0;

    // Step 2: Calculate white meat cost
    let whiteMeatCost = 0;
    const whiteMeatMultipliers = {
      none: 0,
      normal: 1,
      extra: 2,
      xxtra: 3,
    };

    whiteMeatCost = whiteMeatUpcharge * whiteMeatMultipliers[white_meat_tier];

    // Step 3: Calculate customizations cost
    let customizationsCost = 0;
    const customizationBreakdown: ChickenPriceBreakdownItem[] = [];

    if (customization_ids.length > 0) {
      const { data: customizationsData, error: customizationsError } = await supabaseServer
        .from("customizations")
        .select("*")
        .eq("restaurant_id", restaurant_id)
        .in("id", customization_ids)
        .contains("applies_to", ["chicken"])
        .eq("is_available", true);

      if (customizationsError) {
        console.error("❌ Error loading customizations:", customizationsError);
        return NextResponse.json({ error: "Failed to load customizations" }, { status: 500 });
      }

      const customizations = customizationsData || [];

      customizations.forEach((customization) => {
        customizationsCost += customization.base_price;
        customizationBreakdown.push({
          name: customization.name,
          price: customization.base_price,
          type: "customization",
        });
      });
    }

    // Step 4: Build response
    const finalPrice = basePrice + whiteMeatCost + customizationsCost;

    const breakdown: ChickenPriceBreakdownItem[] = [
      {
        name: `${variantData.name} Base`,
        price: basePrice,
        type: "base",
      },
    ];

    if (whiteMeatCost > 0) {
      const tierNames = {
        normal: "White Meat",
        extra: "Extra White Meat",
        xxtra: "XXtra White Meat",
      };

      breakdown.push({
        name: tierNames[white_meat_tier as keyof typeof tierNames] || "White Meat",
        price: whiteMeatCost,
        type: "white_meat",
        tier: white_meat_tier,
      });
    }

    breakdown.push(...customizationBreakdown);

    const response: ChickenPriceResponse = {
      base_price: basePrice,
      white_meat_cost: whiteMeatCost,
      customizations_cost: customizationsCost,
      final_price: finalPrice,
      breakdown,
      estimated_prep_time: calculateChickenPrepTime(variantData.prep_time_minutes, customization_ids.length),
    };

    console.log("✅ Chicken pricing calculated:", {
      finalPrice: response.final_price,
      basePrice,
      whiteMeatCost,
      customizationsCost,
    });

    return NextResponse.json({
      data: response,
      message: "Chicken price calculated successfully",
    });
  } catch (error) {
    console.error("💥 Error in chicken pricing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function calculateChickenPrepTime(basePrepTime: number, customizationCount: number): number {
  const baseTime = basePrepTime || 20;
  const complexityBonus = Math.min(customizationCount * 2, 8);
  return Math.round(baseTime + complexityBonus);
}

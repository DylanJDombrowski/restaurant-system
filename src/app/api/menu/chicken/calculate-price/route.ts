// src/app/api/menu/chicken/calculate-price/route.ts - ENHANCED VERSION
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
  variant_info: {
    name: string;
    serves?: string;
    white_meat_upcharge: number;
  };
}

interface ChickenPriceBreakdownItem {
  name: string;
  price: number;
  type: "base" | "white_meat" | "customization";
  tier?: string;
  category?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ChickenPriceResponse>>> {
  try {
    const body: ChickenPriceRequest = await request.json();
    const { restaurant_id, variant_id, white_meat_tier, customization_ids } = body;

    // Validation
    if (!restaurant_id || !variant_id || !white_meat_tier) {
      return NextResponse.json(
        {
          error: "Missing required fields: restaurant_id, variant_id, white_meat_tier",
        },
        { status: 400 }
      );
    }

    console.log("🐔 Enhanced chicken pricing calculation:", {
      restaurant_id,
      variant_id,
      white_meat_tier,
      customizations: customization_ids.length,
    });

    // Step 1: Get variant details with enhanced error handling
    const { data: variantData, error: variantError } = await supabaseServer
      .from("menu_item_variants")
      .select(
        `
        *,
        menu_item:menu_items!inner(
          id,
          name,
          restaurant_id
        )
      `
      )
      .eq("id", variant_id)
      .eq("menu_items.restaurant_id", restaurant_id)
      .single();

    if (variantError || !variantData) {
      console.error("❌ Variant not found:", variantError);
      return NextResponse.json({ error: "Chicken variant not found or access denied" }, { status: 404 });
    }

    const basePrice = variantData.price;
    const whiteMeatUpcharge = variantData.white_meat_upcharge || 0;

    console.log("🍗 Variant loaded:", {
      name: variantData.name,
      basePrice,
      whiteMeatUpcharge,
    });

    // Step 2: Calculate white meat cost with tier multipliers
    let whiteMeatCost = 0;
    const whiteMeatMultipliers = {
      none: 0,
      normal: 1,
      extra: 2,
      xxtra: 3,
    };

    if (whiteMeatUpcharge > 0) {
      whiteMeatCost = whiteMeatUpcharge * whiteMeatMultipliers[white_meat_tier];
    }

    console.log("🥩 White meat calculation:", {
      tier: white_meat_tier,
      multiplier: whiteMeatMultipliers[white_meat_tier],
      upcharge: whiteMeatUpcharge,
      cost: whiteMeatCost,
    });

    // Step 3: Calculate customizations cost with detailed breakdown
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

      console.log("🔧 Processing customizations:", {
        requested: customization_ids.length,
        found: customizations.length,
        customizations: customizations.map((c) => ({ id: c.id, name: c.name, price: c.base_price })),
      });

      customizations.forEach((customization) => {
        customizationsCost += customization.base_price;

        customizationBreakdown.push({
          name: customization.name,
          price: customization.base_price,
          type: "customization",
          category: customization.category,
        });
      });

      // Check for missing customizations
      const foundIds = customizations.map((c) => c.id);
      const missingIds = customization_ids.filter((id) => !foundIds.includes(id));

      if (missingIds.length > 0) {
        console.warn("⚠️ Some customizations not found:", missingIds);
      }
    }

    // Step 4: Build comprehensive response
    const finalPrice = basePrice + whiteMeatCost + customizationsCost;

    const breakdown: ChickenPriceBreakdownItem[] = [
      {
        name: `${variantData.name} Base`,
        price: basePrice,
        type: "base",
      },
    ];

    // Add white meat breakdown if applicable
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

    // Add customization breakdown
    breakdown.push(...customizationBreakdown);

    const response: ChickenPriceResponse = {
      base_price: basePrice,
      white_meat_cost: whiteMeatCost,
      customizations_cost: customizationsCost,
      final_price: finalPrice,
      breakdown,
      estimated_prep_time: calculateChickenPrepTime(variantData.prep_time_minutes, customization_ids.length, white_meat_tier),
      variant_info: {
        name: variantData.name,
        serves: variantData.serves,
        white_meat_upcharge: whiteMeatUpcharge,
      },
    };

    console.log("✅ Enhanced chicken pricing completed:", {
      finalPrice: response.final_price,
      breakdown: {
        base: basePrice,
        whiteMeat: whiteMeatCost,
        customizations: customizationsCost,
      },
      prepTime: response.estimated_prep_time,
    });

    return NextResponse.json({
      data: response,
      message: "Chicken price calculated successfully",
    });
  } catch (error) {
    console.error("💥 Error in enhanced chicken pricing:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate preparation time based on variant complexity and customizations
 */
function calculateChickenPrepTime(basePrepTime: number, customizationCount: number, whiteMeatTier: string): number {
  let prepTime = basePrepTime || 20; // Default 20 minutes for chicken

  // Add time for customizations
  prepTime += Math.min(customizationCount * 2, 8); // Max 8 extra minutes

  // Add time for white meat preparation (sorting/selection)
  if (whiteMeatTier !== "none") {
    prepTime += 3; // 3 extra minutes for white meat prep
  }

  // Add extra time for complex white meat tiers
  if (whiteMeatTier === "xxtra") {
    prepTime += 2; // Extra time for XXtra white meat
  }

  return Math.round(prepTime);
}

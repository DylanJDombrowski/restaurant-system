// src/app/api/menu/chicken/calculate-price/route.ts - ROBUST VERSION
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

// Request and Response Interfaces (Type-safe)
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

    // --- Validation ---
    if (!restaurant_id || !variant_id || !white_meat_tier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("🐔 Calculating chicken price for variant:", variant_id);

    // --- Step 1: Get Variant Details (More Robustly) ---
    const { data: variantData, error: variantError } = await supabaseServer
      .from("menu_item_variants")
      .select("*")
      .eq("id", variant_id)
      .single();

    if (variantError || !variantData) {
      console.error(`❌ Variant with ID ${variant_id} not found.`, variantError);
      return NextResponse.json({ error: "Chicken variant not found." }, { status: 404 });
    }

    // Security Check: Verify the variant belongs to the correct restaurant via its parent menu item
    const { data: parentMenuItem, error: parentError } = await supabaseServer
      .from("menu_items")
      .select("id, restaurant_id")
      .eq("id", variantData.menu_item_id)
      .single();

    if (parentError || !parentMenuItem || parentMenuItem.restaurant_id !== restaurant_id) {
      console.error("❌ Security check failed: Variant does not belong to the specified restaurant.", {
        variantId: variant_id,
        expectedRestaurant: restaurant_id,
        actualRestaurant: parentMenuItem?.restaurant_id,
      });
      return NextResponse.json({ error: "Access denied to this chicken variant." }, { status: 403 });
    }

    const basePrice = variantData.price;
    const whiteMeatUpcharge = variantData.white_meat_upcharge || 0;
    console.log(`🍗 Variant loaded: ${variantData.name}, Base Price: $${basePrice}, White Meat Upcharge: $${whiteMeatUpcharge}`);

    // --- Step 2: Calculate White Meat Cost ---
    const whiteMeatMultipliers = { none: 0, normal: 1, extra: 2, xxtra: 3 };
    const whiteMeatCost = whiteMeatUpcharge * (whiteMeatMultipliers[white_meat_tier] || 0);
    console.log(`🥩 White meat cost: $${whiteMeatCost} (Tier: ${white_meat_tier})`);

    // --- Step 3: Calculate Customizations Cost ---
    let customizationsCost = 0;
    const customizationBreakdown: ChickenPriceBreakdownItem[] = [];

    if (customization_ids && customization_ids.length > 0) {
      const { data: customizations, error: customizationsError } = await supabaseServer
        .from("customizations")
        .select("id, name, base_price, category")
        .in("id", customization_ids)
        .eq("restaurant_id", restaurant_id)
        .eq("is_available", true);

      if (customizationsError) {
        console.error("❌ Error fetching customizations:", customizationsError);
        // Continue without customizations instead of failing the whole request
      } else if (customizations) {
        customizations.forEach((custom) => {
          customizationsCost += custom.base_price;
          customizationBreakdown.push({
            name: custom.name,
            price: custom.base_price,
            type: "customization",
            category: custom.category,
          });
        });
        console.log(`🔧 Customizations cost: $${customizationsCost} for ${customizations.length} items.`);
      }
    }

    // --- Step 4: Assemble Final Price and Response ---
    const finalPrice = basePrice + whiteMeatCost + customizationsCost;

    const breakdown: ChickenPriceBreakdownItem[] = [{ name: `${variantData.name} Base`, price: basePrice, type: "base" }];
    if (whiteMeatCost > 0) {
      const tierNames: Record<string, string> = { normal: "White Meat", extra: "Extra White Meat", xxtra: "XXtra White Meat" };
      breakdown.push({ name: tierNames[white_meat_tier], price: whiteMeatCost, type: "white_meat", tier: white_meat_tier });
    }
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

    console.log(`✅ Chicken price calculated successfully. Final Price: $${finalPrice}`);
    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("💥 UNEXPECTED ERROR in chicken pricing API:", error);
    return NextResponse.json({ error: "An unexpected internal server error occurred." }, { status: 500 });
  }
}

function calculateChickenPrepTime(basePrepTime: number | null, customizationCount: number, whiteMeatTier: string): number {
  let prepTime = basePrepTime || 20;
  prepTime += Math.min(customizationCount * 2, 8);
  if (whiteMeatTier !== "none") prepTime += 3;
  if (whiteMeatTier === "xxtra") prepTime += 2;
  return Math.round(prepTime);
}

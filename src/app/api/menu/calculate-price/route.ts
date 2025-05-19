// src/app/api/menu/calculate-price/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/menu/calculate-price
 *
 * Enhanced version with proper type handling for Supabase relationships
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variantId, toppingIds = [], modifierIds = [] } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: "variantId is required" },
        { status: 400 }
      );
    }

    // Step 1: Get the base price for the selected variant
    // Notice how we're being explicit about the expected structure
    const { data: variantData, error: variantError } = await supabaseServer
      .from("menu_item_variants")
      .select(
        `
        id, 
        name, 
        price, 
        menu_items!inner(name, pizza_style)
      `
      )
      .eq("id", variantId)
      .single();

    if (variantError || !variantData) {
      console.error("Variant query error:", variantError);
      return NextResponse.json(
        { error: "Invalid variant ID" },
        { status: 400 }
      );
    }

    // Step 2: Extract the menu item data safely
    // Supabase returns menu_items as an array, so we take the first element
    const menuItem = Array.isArray(variantData.menu_items)
      ? variantData.menu_items[0]
      : variantData.menu_items;

    if (!menuItem) {
      return NextResponse.json(
        { error: "Menu item not found for variant" },
        { status: 400 }
      );
    }

    // Step 3: Calculate topping costs with proper type handling
    let toppingCost = 0;
    const toppingBreakdown: Array<{ name: string; price: number }> = [];

    if (toppingIds.length > 0) {
      const { data: toppingPricesData, error: toppingsError } =
        await supabaseServer
          .from("topping_prices")
          .select(
            `
          price,
          toppings!inner(name)
        `
          )
          .eq("menu_item_variant_id", variantId)
          .in("topping_id", toppingIds);

      if (toppingsError) {
        console.error("Error loading topping prices:", toppingsError);
        return NextResponse.json(
          { error: toppingsError.message },
          { status: 500 }
        );
      }

      // Process each topping price, handling the array structure properly
      toppingPricesData?.forEach((tp) => {
        const topping = Array.isArray(tp.toppings)
          ? tp.toppings[0]
          : tp.toppings;
        if (topping && topping.name) {
          toppingCost += tp.price;
          toppingBreakdown.push({
            name: topping.name,
            price: tp.price,
          });
        }
      });
    }

    // Step 4: Calculate modifier costs (no relationship complexity here)
    let modifierCost = 0;
    const modifierBreakdown: Array<{ name: string; price: number }> = [];

    if (modifierIds.length > 0) {
      const { data: modifiers, error: modifiersError } = await supabaseServer
        .from("modifiers")
        .select("name, price_adjustment")
        .in("id", modifierIds);

      if (modifiersError) {
        console.error("Error loading modifiers:", modifiersError);
        return NextResponse.json(
          { error: modifiersError.message },
          { status: 500 }
        );
      }

      modifiers?.forEach((modifier) => {
        modifierCost += modifier.price_adjustment;
        modifierBreakdown.push({
          name: modifier.name,
          price: modifier.price_adjustment,
        });
      });
    }

    // Step 5: Calculate final price and return detailed breakdown
    const finalPrice = variantData.price + toppingCost + modifierCost;

    return NextResponse.json({
      data: {
        basePrice: variantData.price,
        baseName: `${menuItem.name} - ${variantData.name}`,
        toppingCost,
        modifierCost,
        finalPrice,
        breakdown: {
          base: {
            name: `${menuItem.name} - ${variantData.name}`,
            price: variantData.price,
          },
          toppings: toppingBreakdown,
          modifiers: modifierBreakdown,
        },
      },
      message: "Price calculated successfully",
    });
  } catch (error) {
    console.error("Error calculating price:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

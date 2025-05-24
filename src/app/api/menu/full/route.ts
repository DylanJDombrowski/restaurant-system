import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
    }

    console.log("Fetching full menu for restaurant:", restaurantId);

    // Fetch menu items with variants - ENHANCED to handle new structure
    const { data: menuItems, error: menuError } = await supabaseServer
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
      .order("name");

    if (menuError) {
      console.error("Menu items query error:", menuError);
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    // Fetch toppings
    const { data: toppings, error: toppingsError } = await supabaseServer
      .from("toppings")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("category")
      .order("sort_order")
      .order("name");

    if (toppingsError) {
      console.error("Toppings query error:", toppingsError);
      return NextResponse.json({ error: toppingsError.message }, { status: 500 });
    }

    // Fetch modifiers
    const { data: modifiers, error: modifiersError } = await supabaseServer
      .from("modifiers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("name");

    if (modifiersError) {
      console.error("Modifiers query error:", modifiersError);
      return NextResponse.json({ error: modifiersError.message }, { status: 500 });
    }

    // Transform menu items to include properly ordered variants
    const transformedMenuItems = (menuItems || []).map((item: any) => ({
      ...item,
      variants: (item.variants || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)),
    }));

    console.log(
      `Fetched menu: ${transformedMenuItems.length} items, ${toppings?.length || 0} toppings, ${modifiers?.length || 0} modifiers`
    );

    return NextResponse.json({
      data: {
        menu_items: transformedMenuItems,
        toppings: toppings || [],
        modifiers: modifiers || [],
      },
    });
  } catch (error) {
    console.error("Error fetching full menu:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

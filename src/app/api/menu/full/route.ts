import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { MenuItemWithVariants, MenuItemVariant, Topping, Modifier, ApiResponse } from "@/lib/types";

// Define the database response types
interface MenuItemFromDB {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  description?: string;
  base_price: number;
  prep_time_minutes: number;
  is_available: boolean;
  item_type: string;
  allows_custom_toppings: boolean;
  default_toppings_json?: unknown;
  image_url?: string;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    description?: string;
    sort_order: number;
    is_active: boolean;
  } | null;
  variants?: MenuItemVariant[];
}

interface FullMenuResponse {
  menu_items: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<FullMenuResponse>>> {
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

    // Transform menu items with proper typing
    const transformedMenuItems: MenuItemWithVariants[] = ((menuItems as MenuItemFromDB[]) || []).map((item) => ({
      ...item,
      category: item.category
        ? {
            ...item.category,
            restaurant_id: item.restaurant_id, // Add the missing restaurant_id
          }
        : undefined,
      variants: (item.variants || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    }));

    return NextResponse.json({
      data: {
        menu_items: transformedMenuItems,
        toppings: (toppings as Topping[]) || [],
        modifiers: (modifiers as Modifier[]) || [],
      },
    });
  } catch (error) {
    console.error("Error fetching full menu:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

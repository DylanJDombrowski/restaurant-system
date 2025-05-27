import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  MenuItemWithVariants,
  MenuItemVariant,
  Topping,
  Modifier,
  ApiResponse,
} from "@/lib/types";

// Database response types
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

// NEW: Customization type for the unified table
interface Customization {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  base_price: number;
  price_type: "fixed" | "multiplied" | "tiered";
  pricing_rules: Record<string, unknown>; // Fixed: was any
  applies_to: string[];
  sort_order: number;
  is_available: boolean;
  description?: string;
}

interface FullMenuResponse {
  menu_items: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
  customizations: Customization[];
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<FullMenuResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    console.log("Fetching full menu for restaurant:", restaurantId);

    // Fetch menu items with variants
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

    // Fetch from unified customizations table
    const { data: customizations, error: customizationsError } =
      await supabaseServer
        .from("customizations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("category")
        .order("sort_order")
        .order("name");

    if (customizationsError) {
      console.error("Customizations query error:", customizationsError);
      return NextResponse.json(
        { error: customizationsError.message },
        { status: 500 }
      );
    }

    // Transform menu items with proper typing
    const transformedMenuItems: MenuItemWithVariants[] = (
      (menuItems as MenuItemFromDB[]) || []
    ).map((item) => ({
      ...item,
      category: item.category
        ? {
            ...item.category,
            restaurant_id: item.restaurant_id,
          }
        : undefined,
      variants: (item.variants || []).sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
      ),
    }));

    // Transform customizations into legacy format for backward compatibility
    const toppings: Topping[] = (customizations || [])
      .filter((c) => c.category.startsWith("topping_"))
      .map((c) => ({
        id: c.id,
        restaurant_id: c.restaurant_id,
        name: c.name,
        category: c.category.replace("topping_", ""), // Convert topping_normal -> normal
        sort_order: c.sort_order,
        is_available: c.is_available,
        created_at: new Date().toISOString(),
        is_premium:
          c.category === "topping_premium" || c.category === "topping_beef",
        base_price: c.base_price,
      }));

    const modifiers: Modifier[] = (customizations || [])
      .filter((c) => !c.category.startsWith("topping_"))
      .map((c) => ({
        id: c.id,
        restaurant_id: c.restaurant_id,
        name: c.name,
        price_adjustment: c.base_price,
        category: c.category,
        is_available: c.is_available,
        created_at: new Date().toISOString(),
        selected: false, // Fixed: Added missing required property
      }));

    return NextResponse.json({
      data: {
        menu_items: transformedMenuItems,
        toppings,
        modifiers,
        customizations: customizations as Customization[],
      },
    });
  } catch (error) {
    console.error("Error fetching full menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

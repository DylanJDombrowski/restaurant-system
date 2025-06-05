// src/app/api/menu/full/route.ts - UPDATED WITH NEW TYPES
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  MenuItemWithVariants,
  MenuItemVariant,
  ApiResponse,
  Customization,
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

// NEW: Legacy compatibility types (temporary during migration)
interface LegacyTopping {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  sort_order: number;
  is_available: boolean;
  created_at: string;
  is_premium: boolean;
  base_price: number;
}

interface LegacyModifier {
  id: string;
  restaurant_id: string;
  name: string;
  price_adjustment: number;
  category: string;
  is_available: boolean;
  created_at: string;
  selected: boolean;
}

interface FullMenuResponse {
  menu_items: MenuItemWithVariants[];
  customizations: Customization[]; // NEW: Primary data format
  // Legacy compatibility (will be removed)
  toppings: LegacyTopping[];
  modifiers: LegacyModifier[];
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

    const customizationData = (customizations as Customization[]) || [];

    // 🔄 LEGACY COMPATIBILITY: Transform customizations into old format for backwards compatibility
    const legacyToppings: LegacyTopping[] = customizationData
      .filter((c) => c.category.startsWith("topping_"))
      .map((c) => ({
        id: c.id,
        restaurant_id: c.restaurant_id,
        name: c.name,
        category: c.category.replace("topping_", ""), // Convert topping_normal -> normal
        sort_order: c.sort_order,
        is_available: c.is_available,
        created_at: c.created_at,
        is_premium:
          c.category === "topping_premium" || c.category === "topping_beef",
        base_price: c.base_price,
      }));

    const legacyModifiers: LegacyModifier[] = customizationData
      .filter((c) => !c.category.startsWith("topping_"))
      .map((c) => ({
        id: c.id,
        restaurant_id: c.restaurant_id,
        name: c.name,
        price_adjustment: c.base_price,
        category: c.category,
        is_available: c.is_available,
        created_at: c.created_at,
        selected: false, // UI state
      }));

    console.log("📊 Full menu loaded:", {
      menu_items: transformedMenuItems.length,
      customizations: customizationData.length,
      legacy_toppings: legacyToppings.length,
      legacy_modifiers: legacyModifiers.length,
    });

    return NextResponse.json({
      data: {
        menu_items: transformedMenuItems,
        customizations: customizationData, // 🆕 NEW: Primary format
        toppings: legacyToppings, // 🔄 LEGACY: For backwards compatibility
        modifiers: legacyModifiers, // 🔄 LEGACY: For backwards compatibility
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

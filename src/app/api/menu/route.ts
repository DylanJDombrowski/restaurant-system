import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase/client";
import { MenuItemWithCategory, ApiResponse } from "@/src/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MenuItemWithCategory[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurant_id");
    const categoryId = searchParams.get("category_id");
    const availableOnly = searchParams.get("available_only") === "true";

    let query = supabase
      .from("menu_items")
      .select(
        `
        *,
        category:menu_categories(*)
      `
      )
      .order("name");

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (availableOnly) {
      query = query.eq("is_available", true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

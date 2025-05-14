import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { MenuCategory, ApiResponse } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MenuCategory[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurant_id");

    let query = supabase
      .from("menu_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching menu categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, Customization } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Customization[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurant_id");
    const category = searchParams.get("category");
    const appliesTo = searchParams.get("applies_to");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    let query = supabaseServer
      .from("customizations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true);

    if (category) {
      query = query.eq("category", category);
    }

    if (appliesTo) {
      query = query.contains("applies_to", [appliesTo]);
    }

    const { data, error } = await query
      .order("category")
      .order("sort_order")
      .order("name");

    if (error) {
      console.error("Customizations query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data as Customization[]) || [] });
  } catch (error) {
    console.error("Error fetching customizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

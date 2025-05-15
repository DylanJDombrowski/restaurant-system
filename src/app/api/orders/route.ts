import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, OrderWithItems } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OrderWithItems[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");
    const statuses = searchParams.get("statuses");
    const limit = searchParams.get("limit");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    console.log("Fetching orders for restaurant:", restaurantId);
    console.log("Requested statuses:", statuses);

    let query = supabaseServer
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          menu_items(id, name, description, base_price)
        )
      `
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    // Handle multiple statuses if provided
    if (statuses) {
      const statusArray = statuses.split(",").map((s) => s.trim());
      console.log("Filtering by statuses:", statusArray);
      query = query.in("status", statusArray);
    }

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Found ${orders?.length || 0} orders`);

    return NextResponse.json({ data: orders || [] });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

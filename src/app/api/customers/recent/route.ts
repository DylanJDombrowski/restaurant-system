import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, RecentCustomer } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RecentCustomer[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: recentCustomers, error } = await supabaseServer
      .from("customers")
      .select(
        "id, name, phone, loyalty_points, total_orders, last_order_date, updated_at"
      )
      .eq("restaurant_id", restaurantId)
      .not("last_order_date", "is", null)
      .gte("last_order_date", thirtyDaysAgo)
      .order("last_order_date", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load recent customers", details: error.message },
        { status: 500 }
      );
    }

    const formattedCustomers: RecentCustomer[] = (recentCustomers || []).map(
      (customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        last_order_date: customer.last_order_date || customer.updated_at,
        loyalty_points: customer.loyalty_points,
        total_orders: customer.total_orders,
      })
    );

    return NextResponse.json({
      data: formattedCustomers,
      message: `Found ${formattedCustomers.length} recent customers`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

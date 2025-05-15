import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { OrderStatus, ApiResponse, Order } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Order>>> {
  try {
    const params = await context.params;
    console.log("=== Order Status Update Debug ===");
    console.log("Order ID:", params.id);

    const { status } = (await request.json()) as {
      status: OrderStatus;
    };

    console.log("New status:", status);

    // First, let's check if the order exists and what restaurant it belongs to
    const { data: existingOrder, error: fetchError } = await supabaseServer
      .from("orders")
      .select("id, restaurant_id, status")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      console.error("Error fetching existing order:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 404 });
    }

    if (!existingOrder) {
      console.error("Order not found");
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    console.log("Existing order:", existingOrder);

    // Update order status
    const { data: order, error } = await supabaseServer
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        {
          error: `Database error: ${error.message}`,
          details: error.details,
        },
        { status: 500 }
      );
    }

    if (!order) {
      console.error("No order returned after update");
      return NextResponse.json(
        { error: "Order update failed - no data returned" },
        { status: 500 }
      );
    }

    console.log("Order updated successfully:", order);
    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("Unexpected error updating order status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

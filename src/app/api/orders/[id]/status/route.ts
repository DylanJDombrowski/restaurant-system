import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { OrderStatus, ApiResponse, Order } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Order>>> {
  try {
    const params = await context.params;
    console.log("Updating order status for ID:", params.id);

    const { status } = (await request.json()) as {
      status: OrderStatus;
    };

    console.log("New status:", status);

    // Update order status
    const { data: order, error } = await supabaseServer
      .from("orders")
      .update({ status })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Order updated successfully:", order);
    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

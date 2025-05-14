import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { OrderStatus, ApiResponse, Order } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<ApiResponse<Order>>> {
  try {
    const { status, notes } = (await request.json()) as {
      status: OrderStatus;
      notes?: string;
    };

    // Update order status
    const { data: order, error } = await supabaseServer
      .from("orders")
      .update({ status })
      .eq("id", context.params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the status change with notes (for future audit trail)
    if (notes) {
      console.log(
        `Order ${context.params.id} status changed to ${status}. Notes: ${notes}`
      );
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

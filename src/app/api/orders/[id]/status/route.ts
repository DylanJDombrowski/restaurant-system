import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { OrderStatus, ApiResponse, Order } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<Order>>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status, notes } = (await request.json()) as {
      status: OrderStatus;
      notes?: string;
    };

    // Update order status
    const { data: order, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

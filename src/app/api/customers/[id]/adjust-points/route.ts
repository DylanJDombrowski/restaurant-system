// src/app/api/admin/customers/[id]/adjust-points/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const body = await request.json();
    const { points_adjustment, reason, admin_notes } = body;

    if (points_adjustment === undefined || !reason) {
      return NextResponse.json(
        { error: "points_adjustment and reason are required" },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabaseServer
      .from("customers")
      .select("loyalty_points")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const newPointsBalance = Math.max(
      0,
      (customer.loyalty_points || 0) + points_adjustment
    );

    const { error: updateError } = await supabaseServer
      .from("customers")
      .update({
        loyalty_points: newPointsBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (updateError) {
      console.error("Error updating customer points:", updateError);
      return NextResponse.json(
        { error: "Failed to update customer points" },
        { status: 500 }
      );
    }

    await supabaseServer.from("loyalty_transactions").insert({
      customer_id: customerId,
      points_earned: points_adjustment > 0 ? points_adjustment : 0,
      points_redeemed: points_adjustment < 0 ? Math.abs(points_adjustment) : 0,
      transaction_type: "adjusted",
      description: `Admin adjustment: ${reason}${
        admin_notes ? ` - ${admin_notes}` : ""
      }`,
    });

    return NextResponse.json({
      data: {
        new_points_balance: newPointsBalance,
      },
      message: `Successfully adjusted points. New balance: ${newPointsBalance}`,
    });
  } catch (error) {
    console.error("💥 Error adjusting customer points:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

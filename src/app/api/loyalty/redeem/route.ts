// src/app/api/loyalty/redeem/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { RedeemPointsRequest, RedeemPointsResponse } from "@/lib/types/loyalty";

export async function POST(request: NextRequest) {
  try {
    const body: RedeemPointsRequest = await request.json();
    const { order_id, customer_id, points_to_redeem } = body;

    if (!order_id || !customer_id || !points_to_redeem) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: order_id, customer_id, points_to_redeem",
        },
        { status: 400 }
      );
    }

    console.log("🎁 Processing loyalty redemption:", {
      order_id,
      customer_id,
      points_to_redeem,
    });

    // Get current customer
    const { data: customer, error: customerError } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("id", customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has enough points
    if (customer.loyalty_points < points_to_redeem) {
      return NextResponse.json(
        {
          error: `Insufficient points. Customer has ${customer.loyalty_points}, requested ${points_to_redeem}`,
        },
        { status: 400 }
      );
    }

    // Get current order
    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Calculate discount (20 points = $1)
    const REDEMPTION_RATE = 20; // points per dollar
    const discount_amount =
      Math.floor((points_to_redeem / REDEMPTION_RATE) * 100) / 100;
    const max_discount = Math.min(discount_amount, order.total); // Can't discount more than order total
    const actual_points_redeemed = Math.ceil(max_discount * REDEMPTION_RATE);

    // Update customer points
    const { data: updatedCustomer, error: updateError } = await supabaseServer
      .from("customers")
      .update({
        loyalty_points: customer.loyalty_points - actual_points_redeemed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating customer points:", updateError);
      return NextResponse.json(
        { error: "Failed to update customer points" },
        { status: 500 }
      );
    }

    // Update order total
    const new_total = Math.max(0, order.total - max_discount);
    const { error: orderUpdateError } = await supabaseServer
      .from("orders")
      .update({
        total: new_total,
        subtotal: order.subtotal - max_discount, // Adjust subtotal too
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    if (orderUpdateError) {
      console.error("Error updating order total:", orderUpdateError);
      return NextResponse.json(
        { error: "Failed to update order total" },
        { status: 500 }
      );
    }

    // Log the transaction
    const { data: transaction, error: transactionError } = await supabaseServer
      .from("loyalty_transactions")
      .insert({
        customer_id,
        order_id,
        points_earned: 0,
        points_redeemed: actual_points_redeemed,
        transaction_type: "redeemed",
        description: `Redeemed ${actual_points_redeemed} points for $${max_discount.toFixed(
          2
        )} discount`,
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Error logging loyalty transaction:", transactionError);
      // Transaction logged but doesn't fail the redemption
    }

    const response: RedeemPointsResponse = {
      success: true,
      discount_applied: max_discount,
      points_redeemed: actual_points_redeemed,
      remaining_points: updatedCustomer.loyalty_points,
      new_order_total: new_total,
      transaction_id: transaction?.id || "",
    };

    console.log("✅ Loyalty redemption successful:", response);

    return NextResponse.json({
      data: response,
      message: `Successfully redeemed ${actual_points_redeemed} points for $${max_discount.toFixed(
        2
      )} discount`,
    });
  } catch (error) {
    console.error("💥 Error in loyalty redemption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

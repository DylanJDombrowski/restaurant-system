import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";

interface AdjustPointsRequestBody {
  points_adjustment: number;
  reason: string;
  admin_notes?: string;
}

interface AdjustPointsResponseData {
  new_points_balance: number;
}

export async function POST(
  request: Request, // <-- FIX: Use standard Request
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<AdjustPointsResponseData>>> {
  try {
    const customerId = params.id;
    const body = (await request.json()) as AdjustPointsRequestBody;
    const { points_adjustment, reason, admin_notes } = body;

    if (points_adjustment === undefined || !reason) {
      return NextResponse.json(
        { error: "points_adjustment and reason are required" },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabaseServer
      .from("customers")
      .select("id, loyalty_points")
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
      customer.loyalty_points + points_adjustment
    );

    const { error: updateError } = await supabaseServer
      .from("customers")
      .update({ loyalty_points: newPointsBalance })
      .eq("id", customerId);

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to update customer points",
          details: updateError.message,
        },
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
      data: { new_points_balance: newPointsBalance },
      message: `Successfully adjusted points. New balance: ${newPointsBalance}`,
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

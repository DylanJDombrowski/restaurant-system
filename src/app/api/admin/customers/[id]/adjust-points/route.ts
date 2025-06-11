import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";

// Define the shape of the incoming request body for clarity
interface AdjustPointsRequestBody {
  points_adjustment: number;
  reason: string;
  admin_notes?: string;
}

// Define the shape of the successful response data
interface AdjustPointsResponseData {
  new_points_balance: number;
}

// Define a type for the context object, which contains the dynamic route parameters
type RouteContext = {
  params: {
    id: string; // This 'id' corresponds to the `[id]` in the folder name
  };
};

export async function POST(
  request: Request,
  context: RouteContext // Use the explicit context type here
): Promise<NextResponse<ApiResponse<AdjustPointsResponseData>>> {
  try {
    // Extract the customer ID from the context object
    const customerId = context.params.id;
    const body = (await request.json()) as AdjustPointsRequestBody;
    const { points_adjustment, reason, admin_notes } = body;

    if (points_adjustment === undefined || !reason) {
      return NextResponse.json(
        { error: "points_adjustment and reason are required" },
        { status: 400 }
      );
    }

    // Get the customer from the database
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

    // Calculate the new point balance, ensuring it doesn't go below zero
    const newPointsBalance = Math.max(
      0,
      customer.loyalty_points + points_adjustment
    );

    // Update the customer's points in the database
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

    // Log the adjustment as a new transaction for auditing purposes
    await supabaseServer.from("loyalty_transactions").insert({
      customer_id: customerId,
      points_earned: points_adjustment > 0 ? points_adjustment : 0,
      points_redeemed: points_adjustment < 0 ? Math.abs(points_adjustment) : 0,
      transaction_type: "adjusted",
      description: `Admin adjustment: ${reason}${
        admin_notes ? ` - ${admin_notes}` : ""
      }`,
    });

    // Return a successful response
    return NextResponse.json({
      data: { new_points_balance: newPointsBalance },
      message: `Successfully adjusted points. New balance: ${newPointsBalance}`,
    });
  } catch (error) {
    // Catch any other unexpected errors
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

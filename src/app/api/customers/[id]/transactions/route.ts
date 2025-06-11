import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, LoyaltyTransaction } from "@/lib/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> } // ✅ FIXED: Use Promise<> wrapper
): Promise<NextResponse<ApiResponse<LoyaltyTransaction[]>>> {
  try {
    // ✅ FIXED: Await the params
    const params = await context.params;
    const customerId = params.id;

    const { data: transactions, error } = await supabaseServer
      .from("loyalty_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load transactions", details: error.message },
        { status: 500 }
      );
    }

    const data = transactions || [];

    return NextResponse.json({
      data: data,
      message: `Found ${data.length} transactions`,
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

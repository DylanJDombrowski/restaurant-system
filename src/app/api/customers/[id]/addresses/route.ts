import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, CustomerAddress } from "@/lib/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ addresses: CustomerAddress[] }>>> {
  try {
    const params = await context.params;
    const customerId = params.id;

    console.log("Fetching addresses for customer:", customerId);

    const { data: addresses, error } = await supabaseServer
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Found ${addresses?.length || 0} addresses for customer`);

    return NextResponse.json({
      data: { addresses: addresses || [] },
    });
  } catch (error) {
    console.error("Error fetching customer addresses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

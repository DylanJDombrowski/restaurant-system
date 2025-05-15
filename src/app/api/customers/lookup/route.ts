import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, Customer } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ customer: Customer | null }>>> {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const restaurantId = searchParams.get("restaurant_id");

    if (!phone || !restaurantId) {
      return NextResponse.json(
        { error: "Phone number and restaurant_id are required" },
        { status: 400 }
      );
    }

    console.log("Looking up customer by phone:", phone);

    // Clean the phone number (remove formatting)
    const cleanPhone = phone.replace(/\D/g, "");

    // Try to find customer by phone (with different formatting variations)
    const { data: customer, error } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .or(`phone.eq.${phone},phone.eq.${cleanPhone},phone.eq.+1${cleanPhone}`)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found"
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (customer) {
      console.log("Customer found:", customer.name);
      return NextResponse.json({
        data: { customer },
        message: customer ? "Customer found" : "Customer not found",
      });
    } else {
      console.log("No customer found for phone:", phone);
      return NextResponse.json({
        data: { customer: null },
        message: "Customer not found",
      });
    }
  } catch (error) {
    console.error("Error looking up customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

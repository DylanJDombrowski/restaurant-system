// src/app/api/customers/lookup/route.ts - UPDATED with addresses
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, CustomerLoyaltyDetails } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CustomerLoyaltyDetails | null>>> {
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
      .select(
        `
        id,
        restaurant_id,
        phone,
        email,
        name,
        loyalty_points,
        total_orders,
        total_spent,
        created_at,
        updated_at,
        last_order_date,
        addresses:customer_addresses(
          id,
          customer_id,
          label,
          street,
          city,
          state,
          zip_code,
          notes,
          is_default
        )
      `
      )
      .eq("restaurant_id", restaurantId)
      .or(`phone.eq.${phone},phone.eq.${cleanPhone},phone.eq.+1${cleanPhone}`)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found"
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (customer) {
      // Load recent transactions
      const { data: transactions } = await supabaseServer
        .from("loyalty_transactions")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const customerLoyaltyDetails: CustomerLoyaltyDetails = {
        ...customer,
        recent_transactions: transactions || [],
        addresses: customer.addresses || [], // Include addresses in response
      };

      console.log(
        "Customer found:",
        customer.name,
        "with",
        customer.addresses?.length || 0,
        "addresses"
      );
      return NextResponse.json({
        data: customerLoyaltyDetails,
        message: "Customer found",
      });
    } else {
      console.log("No customer found for phone:", phone);
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error looking up customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

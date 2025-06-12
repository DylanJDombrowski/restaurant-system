// src/app/api/customers/lookup/route.ts - FIXED with proper types
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  ApiResponse,
  CustomerLoyaltyDetails,
  CustomerAddress,
} from "@/lib/types";

// Define the existing database schema type
interface ExistingAddressRecord {
  id: string;
  customer_id: string;
  customer_phone: string;
  customer_name: string;
  customer_email?: string;
  address: string;
  city: string;
  zip: string;
  delivery_instructions?: string;
  is_default: boolean;
  created_at: string;
}

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
          customer_phone,
          customer_name,
          customer_email,
          address,
          city,
          zip,
          delivery_instructions,
          is_default,
          created_at
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

      // Transform addresses to match expected interface
      const transformedAddresses: CustomerAddress[] =
        customer.addresses?.map((addr: ExistingAddressRecord) => ({
          id: addr.id,
          customer_id: addr.customer_id,
          label: addr.customer_name || "Address", // Use customer_name as label fallback
          street: addr.address || "",
          city: addr.city || "",
          state: "OH", // Default state since not in your schema
          zip_code: addr.zip || "",
          notes: addr.delivery_instructions || "",
          is_default: addr.is_default || false,
          created_at: addr.created_at,
          updated_at: addr.created_at, // Use created_at as fallback
        })) || [];

      const customerLoyaltyDetails: CustomerLoyaltyDetails = {
        ...customer,
        recent_transactions: transactions || [],
        addresses: transformedAddresses, // Use transformed addresses
      };

      console.log(
        "Customer found:",
        customer.name,
        "with",
        transformedAddresses.length,
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

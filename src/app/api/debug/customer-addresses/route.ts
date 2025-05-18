import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Response interface for the debug endpoint
 *
 * This interface ensures our response has a consistent structure
 * and helps TypeScript understand what data we're returning.
 */
interface DebugResponse {
  search_criteria: {
    original_phone: string;
    clean_phone: string;
    restaurant_id: string;
  };
  summary: {
    customers_found: number;
    total_addresses: number;
    total_delivery_orders: number;
    potential_issues: string[];
  };
  customers: Array<{
    customer: {
      id: string;
      name: string | null;
      phone: string;
      email: string | null;
      total_orders: number;
      loyalty_points: number;
      created_at: string;
      updated_at: string;
    };
    addresses: Array<{
      id: string;
      address: string;
      city: string;
      zip: string;
      delivery_instructions: string | null;
      is_default: boolean;
      created_at: string;
    }>;
    delivery_orders: Array<{
      id: string;
      order_number: string;
      order_type: string;
      customer_address: string | null;
      customer_city: string | null;
      customer_zip: string | null;
      created_at: string;
    }>;
  }>;
}

/**
 * Debug API for Customer Address Issues
 *
 * This endpoint helps diagnose issues with customer address saving
 * and retrieval. Think of it like a diagnostic tool that shows you
 * exactly what's in your customer database and helps identify
 * where the address saving process might be failing.
 */
export async function GET(request: NextRequest): Promise<NextResponse<DebugResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const restaurantId = searchParams.get("restaurant_id");

    if (!phone || !restaurantId) {
      return NextResponse.json({ error: "Both phone and restaurant_id parameters are required" }, { status: 400 });
    }

    console.log("🔍 Debugging customer addresses for phone:", phone);

    // Clean phone number for matching
    const cleanPhone = phone.replace(/\D/g, "");

    // Look for customer with various phone formats
    const { data: customers, error: customerError } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .or(`phone.eq.${phone},phone.eq.${cleanPhone},phone.eq.+1${cleanPhone}`);

    if (customerError) {
      console.error("❌ Error finding customers:", customerError);
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }

    console.log(`📊 Found ${customers?.length || 0} customer records`);

    // For each customer, get their addresses and delivery orders
    const customerData = [];

    for (const customer of customers || []) {
      // Fetch addresses for this customer
      const { data: addresses, error: addressError } = await supabaseServer
        .from("customer_addresses")
        .select("id, address, city, zip, delivery_instructions, is_default, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (addressError) {
        console.error("❌ Error fetching addresses for customer:", customer.id, addressError);
      }

      // Get delivery orders for this customer to see delivery history
      const { data: orders, error: orderError } = await supabaseServer
        .from("orders")
        .select("id, order_number, order_type, customer_address, customer_city, customer_zip, created_at")
        .eq("customer_id", customer.id)
        .eq("order_type", "delivery")
        .order("created_at", { ascending: false })
        .limit(10);

      if (orderError) {
        console.error("❌ Error fetching orders for customer:", customer.id, orderError);
      }

      customerData.push({
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          total_orders: customer.total_orders,
          loyalty_points: customer.loyalty_points,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        },
        addresses: addresses || [],
        delivery_orders: orders || [],
      });
    }

    // Calculate summary statistics
    const totalAddresses = customerData.reduce((sum, c) => sum + c.addresses.length, 0);
    const totalDeliveryOrders = customerData.reduce((sum, c) => sum + c.delivery_orders.length, 0);

    const response: DebugResponse = {
      search_criteria: {
        original_phone: phone,
        clean_phone: cleanPhone,
        restaurant_id: restaurantId,
      },
      summary: {
        customers_found: customers?.length || 0,
        total_addresses: totalAddresses,
        total_delivery_orders: totalDeliveryOrders,
        potential_issues: [],
      },
      customers: customerData,
    };

    // Identify potential issues and add them to the response
    if (totalDeliveryOrders > 0 && totalAddresses === 0) {
      response.summary.potential_issues.push("Customer has delivery orders but no saved addresses - address saving may be failing");
    }

    if (customers && customers.length > 1) {
      response.summary.potential_issues.push("Multiple customer records found for same phone - may indicate duplicate customer creation");
    }

    // Check each customer for specific issues
    customerData.forEach((customerInfo, index) => {
      if (customerInfo.delivery_orders.length > 0 && customerInfo.addresses.length === 0) {
        response.summary.potential_issues.push(
          `Customer ${index + 1} (${customerInfo.customer.name}) has ${
            customerInfo.delivery_orders.length
          } delivery orders but no saved addresses`
        );
      }

      // Check for mismatched address data in orders vs saved addresses
      const orderAddresses = customerInfo.delivery_orders
        .filter((order) => order.customer_address && order.customer_city && order.customer_zip)
        .map((order) => `${order.customer_address}, ${order.customer_city} ${order.customer_zip}`);

      const savedAddresses = customerInfo.addresses.map((addr) => `${addr.address}, ${addr.city} ${addr.zip}`);

      const uniqueOrderAddresses = [...new Set(orderAddresses)];
      if (uniqueOrderAddresses.length > customerInfo.addresses.length) {
        response.summary.potential_issues.push(
          `Customer ${index + 1} has used ${uniqueOrderAddresses.length} unique addresses in orders but only ${
            customerInfo.addresses.length
          } are saved`
        );
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Unexpected error in debug endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Interface for the POST request body
 *
 * This ensures we have proper typing for the manual address saving requests.
 */
interface ManualAddressSaveRequest {
  customerId?: string;
  orderId?: string;
  forceUpdate?: boolean;
}

/**
 * POST endpoint to manually trigger address saving for existing orders
 *
 * This can help backfill addresses from orders that were placed before
 * the address saving feature was properly implemented.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ManualAddressSaveRequest;
    const { customerId, orderId, forceUpdate } = body;

    if (!customerId && !orderId) {
      return NextResponse.json({ error: "Either customerId or orderId must be provided" }, { status: 400 });
    }

    console.log("🔧 Manual address saving triggered:", { customerId, orderId, forceUpdate });

    let orders = [];

    if (orderId) {
      // Process specific order
      const { data: order, error } = await supabaseServer
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("order_type", "delivery")
        .single();

      if (error || !order) {
        return NextResponse.json({ error: "Order not found or not a delivery order" }, { status: 404 });
      }

      orders = [order];
    } else if (customerId) {
      // Process all delivery orders for customer
      const { data: customerOrders, error } = await supabaseServer
        .from("orders")
        .select("*")
        .eq("customer_id", customerId)
        .eq("order_type", "delivery")
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      orders = customerOrders || [];
    }

    let processedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const order of orders) {
      try {
        // Validate that we have complete address information
        if (!order.customer_address || !order.customer_city || !order.customer_zip) {
          results.push({
            order_id: order.id,
            status: "skipped",
            reason: "Incomplete address information",
          });
          continue;
        }

        // Check if address already exists (unless we're forcing an update)
        const { data: existingAddress } = await supabaseServer
          .from("customer_addresses")
          .select("id")
          .eq("customer_id", order.customer_id)
          .eq("address", order.customer_address)
          .eq("city", order.customer_city)
          .eq("zip", order.customer_zip)
          .maybeSingle();

        if (existingAddress && !forceUpdate) {
          results.push({
            order_id: order.id,
            status: "skipped",
            reason: "Address already exists",
          });
          continue;
        }

        // Create new address record
        const newAddress = {
          customer_id: order.customer_id,
          restaurant_id: order.restaurant_id,
          customer_phone: order.customer_phone || "",
          customer_name: order.customer_name || "",
          customer_email: order.customer_email,
          address: order.customer_address,
          city: order.customer_city,
          zip: order.customer_zip,
          delivery_instructions: order.delivery_instructions,
          is_default: false, // Don't override existing defaults
        };

        const { data: savedAddress, error: saveError } = await supabaseServer
          .from("customer_addresses")
          .insert(newAddress)
          .select()
          .single();

        if (saveError) {
          console.error("❌ Error saving address for order:", order.id, saveError);
          errorCount++;
          results.push({
            order_id: order.id,
            status: "error",
            error: saveError.message,
          });
        } else {
          processedCount++;
          results.push({
            order_id: order.id,
            status: "success",
            address_id: savedAddress.id,
          });
        }
      } catch (error) {
        console.error("❌ Unexpected error processing order:", order.id, error);
        errorCount++;
        results.push({
          order_id: order.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      summary: {
        total_orders: orders.length,
        processed: processedCount,
        errors: errorCount,
        skipped: orders.length - processedCount - errorCount,
      },
      results,
    });
  } catch (error) {
    console.error("❌ Unexpected error in manual address save:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

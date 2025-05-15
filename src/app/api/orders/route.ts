import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  ApiResponse,
  OrderWithItems,
  InsertOrder,
  InsertOrderItem,
  InsertCustomer,
} from "@/lib/types";

// GET handler - existing functionality
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OrderWithItems[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");
    const statuses = searchParams.get("statuses");
    const limit = searchParams.get("limit");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    console.log("Fetching orders for restaurant:", restaurantId);
    console.log("Requested statuses:", statuses);

    let query = supabaseServer
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          menu_items(id, name, description, base_price)
        )
      `
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    // Handle multiple statuses if provided
    if (statuses) {
      const statusArray = statuses.split(",").map((s) => s.trim());
      console.log("Filtering by statuses:", statusArray);
      query = query.in("status", statusArray);
    }

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Found ${orders?.length || 0} orders`);

    return NextResponse.json({ data: orders || [] });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST handler - enhanced to handle customer creation and address saving
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OrderWithItems>>> {
  try {
    console.log("=== Creating New Order ===");

    const body = await request.json();
    console.log("Request body:", body);

    const { orderData, orderItems } = body;

    if (!orderData || !orderItems) {
      return NextResponse.json(
        { error: "Missing orderData or orderItems" },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = generateOrderNumber();
    console.log("Generated order number:", orderNumber);

    // Handle customer creation/update
    let customerId = null;
    if (orderData.customer_phone) {
      customerId = await handleCustomer(orderData);
    }

    // Create the order
    const orderInsert: InsertOrder = {
      ...orderData,
      order_number: orderNumber,
      customer_id: customerId,
    };

    console.log("Inserting order:", orderInsert);

    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .insert(orderInsert)
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { error: `Failed to create order: ${orderError.message}` },
        { status: 500 }
      );
    }

    console.log("Order created:", order);

    // Save delivery address if it's a delivery order and customer exists
    if (
      order.order_type === "delivery" &&
      customerId &&
      order.customer_address
    ) {
      await handleDeliveryAddress(customerId, orderData);
    }

    // Define a type for incoming order item data
    type IncomingOrderItem = {
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      specialInstructions?: string;
    };

    // Create order items
    const orderItemsToInsert: InsertOrderItem[] = orderItems.map(
      (item: IncomingOrderItem) => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
        special_instructions: item.specialInstructions || null,
      })
    );

    console.log("Inserting order items:", orderItemsToInsert);

    const { data: createdOrderItems, error: itemsError } = await supabaseServer
      .from("order_items")
      .insert(orderItemsToInsert).select(`
        *,
        menu_items(id, name, description, base_price)
      `);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Try to delete the order if items failed
      await supabaseServer.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: `Failed to create order items: ${itemsError.message}` },
        { status: 500 }
      );
    }

    console.log("Order items created:", createdOrderItems);

    // Update customer stats if customer exists
    if (customerId) {
      await updateCustomerStats(customerId, order.total);
    }

    // Return complete order with items
    const completeOrder = {
      ...order,
      order_items: createdOrderItems,
    };

    console.log("Order creation completed successfully");

    return NextResponse.json({
      data: completeOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Unexpected error creating order:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to handle customer creation/update
async function handleCustomer(orderData: InsertOrder): Promise<string | null> {
  try {
    console.log("Handling customer for phone:", orderData.customer_phone);

    // Clean phone number
    const cleanPhone = (orderData.customer_phone ?? "").replace(/\D/g, "");

    // Try to find existing customer
    const { data: existingCustomer } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("restaurant_id", orderData.restaurant_id)
      .or(
        `phone.eq.${orderData.customer_phone},phone.eq.${cleanPhone},phone.eq.+1${cleanPhone}`
      )
      .single();

    if (existingCustomer) {
      console.log("Found existing customer:", existingCustomer.id);

      // Update customer info if needed
      const updates: Record<string, unknown> = {};
      if (!existingCustomer.name && orderData.customer_name) {
        updates.name = orderData.customer_name;
      }
      if (!existingCustomer.email && orderData.customer_email) {
        updates.email = orderData.customer_email;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabaseServer
          .from("customers")
          .update(updates)
          .eq("id", existingCustomer.id);
        console.log("Updated customer with:", updates);
      }

      return existingCustomer.id;
    }

    // Create new customer
    if (orderData.customer_name && orderData.customer_phone) {
      console.log("Creating new customer");

      const newCustomer: InsertCustomer = {
        restaurant_id: orderData.restaurant_id,
        phone: orderData.customer_phone,
        name: orderData.customer_name,
        email: orderData.customer_email || null,
        loyalty_points: 0,
        total_orders: 0,
        total_spent: 0,
      };

      const { data: customer, error: createError } = await supabaseServer
        .from("customers")
        .insert(newCustomer)
        .select()
        .single();

      if (createError) {
        console.error("Error creating customer:", createError);
        return null;
      }

      console.log("Created new customer:", customer.id);
      return customer.id;
    }

    return null;
  } catch (error) {
    console.error("Error handling customer:", error);
    return null;
  }
}

// Helper function to save delivery address
async function handleDeliveryAddress(
  customerId: string,
  orderData: InsertOrder
) {
  try {
    if (
      !orderData.customer_address ||
      !orderData.customer_city ||
      !orderData.customer_zip
    ) {
      return;
    }

    console.log("Saving delivery address for customer:", customerId);

    // Check if this address already exists
    const { data: existingAddress } = await supabaseServer
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .eq("address", orderData.customer_address)
      .eq("city", orderData.customer_city)
      .eq("zip", orderData.customer_zip)
      .single();

    if (existingAddress) {
      console.log("Address already exists, skipping creation");
      return;
    }

    // Create new address
    const newAddress = {
      customer_id: customerId,
      restaurant_id: orderData.restaurant_id,
      customer_phone: orderData.customer_phone,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      address: orderData.customer_address,
      city: orderData.customer_city,
      zip: orderData.customer_zip,
      delivery_instructions: orderData.delivery_instructions || null,
      is_default: false, // You could make this configurable
    };

    const { error } = await supabaseServer
      .from("customer_addresses")
      .insert(newAddress);

    if (error) {
      console.error("Error saving address:", error);
    } else {
      console.log("Delivery address saved successfully");
    }
  } catch (error) {
    console.error("Error handling delivery address:", error);
  }
}

// Helper function to update customer statistics
async function updateCustomerStats(customerId: string, orderTotal: number) {
  try {
    console.log("Updating customer stats for:", customerId);

    // Calculate loyalty points (1 point per dollar)
    const pointsEarned = Math.floor(orderTotal);

    // Use the database function to update customer stats
    const { error } = await supabaseServer.rpc("update_customer_stats", {
      customer_id: customerId,
      order_total: orderTotal,
      points_earned: pointsEarned,
    });

    if (error) {
      console.error("Error updating customer stats:", error);
      // Fallback to manual update
      // Manually increment fields by first fetching current values
      const { data: customer, error: fetchError } = await supabaseServer
        .from("customers")
        .select("total_orders, total_spent, loyalty_points")
        .eq("id", customerId)
        .single();

      if (!fetchError && customer) {
        const { total_orders, total_spent, loyalty_points } = customer;
        const { error: fallbackError } = await supabaseServer
          .from("customers")
          .update({
            total_orders: (total_orders ?? 0) + 1,
            total_spent: (total_spent ?? 0) + orderTotal,
            loyalty_points: (loyalty_points ?? 0) + pointsEarned,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customerId);

        if (fallbackError) {
          console.error("Fallback update also failed:", fallbackError);
        }
      } else {
        console.error(
          "Failed to fetch customer for fallback update:",
          fetchError
        );
      }
    } else {
      console.log(
        `Updated customer stats: +${pointsEarned} points, +$${orderTotal} spent`
      );
    }

    // Log loyalty transaction
    await supabaseServer.from("loyalty_transactions").insert({
      customer_id: customerId,
      points_earned: pointsEarned,
      points_redeemed: 0,
      transaction_type: "earned",
      description: `Order reward: ${pointsEarned} points`,
    });
  } catch (error) {
    console.error("Error updating customer stats:", error);
  }
}

// Helper function to generate order numbers
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `ORD-${timestamp}-${random}`;
}

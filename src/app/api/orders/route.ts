import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  ApiResponse,
  OrderWithItems,
  InsertOrder,
  InsertOrderItem,
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

// POST handler - create new order
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

    // Create the order
    const orderInsert: InsertOrder = {
      ...orderData,
      order_number: orderNumber,
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

    // Define the expected type for order items
    type OrderItemInput = {
      menuItemId: number;
      quantity: number;
      unitPrice: number;
      specialInstructions?: string;
    };

    // Create order items
    const orderItemsToInsert: InsertOrderItem[] = orderItems.map(
      (item: OrderItemInput) => ({
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

// Helper function to generate order numbers
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `ORD-${timestamp}-${random}`;
}

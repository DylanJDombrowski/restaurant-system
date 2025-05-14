import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { InsertOrder, OrderWithItems, ApiResponse } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OrderWithItems[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurant_id");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;

    let query = supabaseServer
      .from("orders")
      .select(
        `
        *,
        order_items:order_items(
          *,
          menu_item:menu_items(*)
        ),
        customer:customers(name, phone, loyalty_points)
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OrderWithItems>>> {
  try {
    console.log("Creating order - request received");

    const body = await request.json();
    console.log("Request body:", body);

    const { orderData, orderItems } = body as {
      orderData: Omit<InsertOrder, "order_number">;
      orderItems: Array<{
        menuItemId: string;
        quantity: number;
        unitPrice: number;
        specialInstructions?: string;
      }>;
    };

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
      Math.random() * 100
    )
      .toString()
      .padStart(2, "0")}`;
    console.log("Generated order number:", orderNumber);

    // Calculate totals
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const taxRate = 0.08; // 8% tax
    const taxAmount = subtotal * taxRate;
    const deliveryFee = orderData.order_type === "delivery" ? 3.99 : 0;
    const total = subtotal + taxAmount + deliveryFee;

    console.log("Order totals:", { subtotal, taxAmount, deliveryFee, total });

    // Create order
    const orderToInsert = {
      ...orderData,
      order_number: orderNumber,
      subtotal,
      tax_amount: taxAmount,
      delivery_fee: deliveryFee,
      total,
      status: "pending" as const,
    };

    console.log("Creating order with data:", orderToInsert);

    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .insert([orderToInsert])
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    console.log("Order created successfully:", order);

    // Create order items
    const orderItemsData = orderItems.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      special_instructions: item.specialInstructions || null,
    }));

    console.log("Creating order items:", orderItemsData);

    const { error: itemsError } = await supabaseServer
      .from("order_items")
      .insert(orderItemsData);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // If order items creation fails, delete the order
      await supabaseServer.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    console.log("Order items created successfully");

    // Fetch complete order with items
    const { data: completeOrder, error: fetchError } = await supabaseServer
      .from("orders")
      .select(
        `
        *,
        order_items:order_items(
          *,
          menu_item:menu_items(*)
        )
      `
      )
      .eq("id", order.id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete order:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log("Complete order fetched:", completeOrder);

    return NextResponse.json({ data: completeOrder }, { status: 201 });
  } catch (error) {
    console.error("Error in order creation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

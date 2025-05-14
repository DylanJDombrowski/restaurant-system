import { NextRequest, NextResponse } from "next/server";
import { supabase, generateOrderNumber } from "@/lib/supabase/client";
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

    let query = supabase
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
    const body = await request.json();
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
    const orderNumber = generateOrderNumber();

    // Calculate totals
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const taxRate = 0.08; // 8% tax
    const taxAmount = subtotal * taxRate;
    const deliveryFee = orderData.order_type === "delivery" ? 3.99 : 0;
    const total = subtotal + taxAmount + deliveryFee;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          ...orderData,
          order_number: orderNumber,
          subtotal,
          tax_amount: taxAmount,
          delivery_fee: deliveryFee,
          total,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Create order items
    const orderItemsData = orderItems.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      special_instructions: item.specialInstructions,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsData);

    if (itemsError) {
      // If order items creation fails, delete the order
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Fetch complete order with items
    const { data: completeOrder, error: fetchError } = await supabase
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
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ data: completeOrder }, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { InsertOrder, InsertCustomer, OrderWithItems, ApiResponse, MenuItem, MenuItemVariant, OrderType, OrderStatus } from "@/lib/types";

interface EnhancedOrderItem {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  selectedToppings?: Array<{
    id: string;
    name: string;
    amount: "light" | "normal" | "extra";
    price: number;
    isDefault: boolean;
  }>;
  selectedModifiers?: Array<{
    id: string;
    name: string;
    priceAdjustment: number;
  }>;
  specialInstructions?: string;
}

interface OrderFromDB {
  id: string;
  restaurant_id: string;
  customer_id?: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  order_type?: string;
  status: string;
  customer_address?: string;
  customer_city?: string;
  customer_zip?: string;
  delivery_instructions?: string;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  delivery_fee: number;
  total: number;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
  order_items?: Array<{
    id: string;
    order_id: string;
    menu_item_id: string;
    menu_item_variant_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    selected_toppings_json?: unknown;
    selected_modifiers_json?: unknown;
    special_instructions?: string;
    created_at: string;
    menu_items?: {
      id: string;
      name: string;
      description?: string;
    } | null;
    menu_item_variants?: {
      id: string;
      name: string;
      price: number;
    } | null;
    [key: string]: unknown;
  }>;
}

interface OrderRequestBody {
  orderData: InsertOrder;
  orderItems: EnhancedOrderItem[];
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<OrderWithItems[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");
    const statusesParam = searchParams.get("statuses");
    const limitParam = searchParams.get("limit");

    // Validate required parameters
    if (!restaurantId) {
      return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
    }

    console.log("Fetching orders for restaurant:", restaurantId);

    // Parse optional parameters
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const statuses = statusesParam ? statusesParam.split(",") : null;

    // Build the query to fetch orders with all related data
    let query = supabaseServer
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          menu_items(id, name, description),
          menu_item_variants(id, name, price)
        )
      `
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    // Add status filter if provided
    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    // Add limit
    query = query.limit(limit);

    const { data: orders, error } = await query;

    if (error) {
      console.error("Database error fetching orders:", error);
      return NextResponse.json({ error: `Failed to fetch orders: ${error.message}` }, { status: 500 });
    }

    // Transform the orders with proper typing
    const transformedOrders: OrderWithItems[] = ((orders as OrderFromDB[]) || []).map((order) => ({
      ...order,
      status: order.status as OrderStatus,
      order_type: order.order_type as OrderType | undefined,
      order_items:
        order.order_items?.map((item) => ({
          ...item,
          // Cast to proper types and convert null to undefined
          menu_item: item.menu_items
            ? ({
                ...item.menu_items,
                restaurant_id: order.restaurant_id, // Add missing fields
                category_id: undefined,
                base_price: 0,
                prep_time_minutes: 0,
                is_available: true,
                item_type: "standard",
                allows_custom_toppings: false,
                created_at: item.created_at,
                updated_at: item.created_at,
              } as MenuItem)
            : undefined,
          menu_item_variant: item.menu_item_variants
            ? ({
                ...item.menu_item_variants,
                menu_item_id: item.menu_item_id,
                serves: undefined,
                crust_type: undefined,
                sort_order: 0,
                is_available: true,
                prep_time_minutes: 0,
                size_code: "",
              } as MenuItemVariant)
            : undefined,
        })) || [],
    }));

    console.log(`Successfully fetched ${transformedOrders.length} orders`);

    return NextResponse.json({
      data: transformedOrders,
      message: `Fetched ${transformedOrders.length} orders`,
    });
  } catch (error) {
    console.error("Unexpected error fetching orders:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Creating Enhanced Order ===");

    const body = (await request.json()) as OrderRequestBody;
    const { orderData, orderItems } = body;

    // Validate that we have the required data
    if (!orderData || !orderItems || !Array.isArray(orderItems)) {
      return NextResponse.json({ error: "Missing orderData or orderItems" }, { status: 400 });
    }

    console.log("Processing order with", orderItems.length, "items");

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Handle customer creation/lookup
    let customerId: string | null = null;
    if (orderData.customer_phone) {
      customerId = await handleCustomerCreation(orderData);
    }

    // Create the order record
    const orderInsert: InsertOrder = {
      ...orderData,
      order_number: orderNumber,
      customer_id: customerId || undefined,
    };

    const { data: order, error: orderError } = await supabaseServer.from("orders").insert(orderInsert).select().single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    console.log("Order created successfully:", order.id);

    // Create order items with variant support
    const orderItemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      menu_item_variant_id: item.variantId || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      selected_toppings_json: item.selectedToppings || [],
      selected_modifiers_json: item.selectedModifiers || [],
      special_instructions: item.specialInstructions || null,
    }));

    const { data: createdOrderItems, error: itemsError } = await supabaseServer.from("order_items").insert(orderItemsToInsert).select(`
        *,
        menu_items(id, name, description),
        menu_item_variants(id, name, price)
      `);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Rollback the order if items creation fails
      await supabaseServer.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    console.log("Order items created successfully:", createdOrderItems.length);

    // Update customer statistics if we have a customer
    if (customerId) {
      await updateCustomerStats(customerId, order.total);
    }

    // Return the complete order
    const completeOrder = {
      ...order,
      order_items: createdOrderItems,
    };

    console.log("✅ Order created successfully");

    return NextResponse.json({
      data: completeOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleCustomerCreation(orderData: InsertOrder): Promise<string | null> {
  try {
    console.log("🔍 Customer lookup for:", orderData.customer_phone);

    // Clean phone number for matching
    const cleanPhone = (orderData.customer_phone ?? "").replace(/\D/g, "");

    // Try to find existing customer
    const { data: existingCustomer, error: lookupError } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("restaurant_id", orderData.restaurant_id)
      .or(`phone.eq.${orderData.customer_phone},phone.eq.${cleanPhone},phone.eq.+1${cleanPhone}`)
      .maybeSingle();

    if (lookupError) {
      console.error("❌ Customer lookup error:", lookupError);
    }

    if (existingCustomer) {
      console.log("✅ Found existing customer:", existingCustomer.name);
      return existingCustomer.id;
    }

    // Create new customer if we have sufficient information
    if (orderData.customer_name && orderData.customer_phone) {
      console.log("👤 Creating new customer...");

      const newCustomer: InsertCustomer = {
        restaurant_id: orderData.restaurant_id,
        phone: orderData.customer_phone,
        name: orderData.customer_name,
        email: orderData.customer_email,
        loyalty_points: 0,
        total_orders: 0,
        total_spent: 0,
      };

      const { data: customer, error: createError } = await supabaseServer.from("customers").insert(newCustomer).select().single();

      if (createError) {
        console.error("❌ Error creating customer:", createError);
        return null;
      }

      console.log("✅ Created new customer:", customer.name);
      return customer.id;
    }

    console.log("⚠️ Insufficient customer information");
    return null;
  } catch (error) {
    console.error("❌ Unexpected error handling customer:", error);
    return null;
  }
}

async function updateCustomerStats(customerId: string, orderTotal: number): Promise<void> {
  try {
    console.log("📊 Updating customer stats for:", customerId);

    // Calculate loyalty points (1 point per dollar)
    const pointsEarned = Math.floor(orderTotal);

    // Get current customer stats first
    const { data: customer, error: fetchError } = await supabaseServer
      .from("customers")
      .select("total_orders, total_spent, loyalty_points")
      .eq("id", customerId)
      .single();

    if (fetchError || !customer) {
      console.error("❌ Error fetching customer for stats update:", fetchError);
      return;
    }

    // Calculate new values
    const newTotalOrders = (customer.total_orders || 0) + 1;
    const newTotalSpent = (customer.total_spent || 0) + orderTotal;
    const newLoyaltyPoints = (customer.loyalty_points || 0) + pointsEarned;

    // Update customer statistics
    const { error: updateError } = await supabaseServer
      .from("customers")
      .update({
        total_orders: newTotalOrders,
        total_spent: newTotalSpent,
        loyalty_points: newLoyaltyPoints,
        last_order_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (updateError) {
      console.error("❌ Error updating customer stats:", updateError);
      return;
    }

    console.log("✅ Customer stats updated successfully");
  } catch (error) {
    console.error("❌ Unexpected error updating customer stats:", error);
  }
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `ORD-${timestamp}-${random}`;
}

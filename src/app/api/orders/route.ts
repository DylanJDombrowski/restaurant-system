// src/app/api/orders/enhanced/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { InsertOrder, InsertCustomer, InsertCustomerAddress, OrderWithItems, ApiResponse } from "@/lib/types";
import { CartItemTransformer } from "@/lib/utils/cart-transformers";

/**
 * Enhanced Order Creation API
 *
 * This endpoint handles the sophisticated order format from our enhanced UI.
 * It processes configured items with variants, toppings, modifiers, and
 * complex pricing logic.
 *
 * Key differences from the basic order API:
 * 1. Handles menu item variants (sizes, crusts)
 * 2. Processes topping and modifier selections
 * 3. Stores customization data in JSON fields
 * 4. Calculates complex pricing with proper validation
 */

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

    // Transform the orders to include properly typed order items
    const transformedOrders: OrderWithItems[] = (orders || []).map((order) => ({
      ...order,
      order_items:
        order.order_items?.map(
          (item: {
            id: string;
            menu_items?: { id: string; name: string; description: string };
            menu_item_variants?: { id: string; name: string; price: number };
            [key: string]: unknown;
          }) => ({
            ...item,
            // Ensure proper structure for order items
            menu_item: item.menu_items || null,
            menu_item_variant: item.menu_item_variants || null,
          })
        ) || [],
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

    const body = await request.json();
    const { orderData, orderItems } = body;

    // Validate that we have the required data
    if (!orderData || !orderItems || !Array.isArray(orderItems)) {
      return NextResponse.json({ error: "Missing orderData or orderItems" }, { status: 400 });
    }

    console.log("Processing order with", orderItems.length, "items");

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Handle customer creation/lookup
    let customerId = null;
    if (orderData.customer_phone) {
      customerId = await handleCustomerCreation(orderData);
    }

    // Create the order record
    const orderInsert = {
      ...orderData,
      order_number: orderNumber,
      customer_id: customerId,
    };

    const { data: order, error: orderError } = await supabaseServer.from("orders").insert(orderInsert).select().single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    console.log("Order created successfully:", order.id);

    // Create order items with variant support
    const orderItemsToInsert = orderItems.map((item: any) => ({
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

/**
 * Enhanced Customer Handling
 *
 * Similar to the basic version but with enhanced error handling for
 * the more complex order flow.
 */
async function handleCustomerWithEnhancedErrorHandling(orderData: InsertOrder): Promise<string | null> {
  try {
    console.log("🔍 Enhanced customer lookup for:", orderData.customer_phone);

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

      // Update customer info if we have new information
      const updates: Partial<InsertCustomer> = {};
      let hasUpdates = false;

      if (!existingCustomer.name && orderData.customer_name) {
        updates.name = orderData.customer_name;
        hasUpdates = true;
      }
      if (!existingCustomer.email && orderData.customer_email) {
        updates.email = orderData.customer_email;
        hasUpdates = true;
      }

      if (hasUpdates) {
        await supabaseServer
          .from("customers")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCustomer.id);
      }

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

/**
 * Enhanced Delivery Address Handling
 *
 * Handles saving delivery addresses for future use, with enhanced
 * error handling and validation.
 */
async function handleDeliveryAddressWithErrorHandling(customerId: string, orderData: InsertOrder): Promise<boolean> {
  try {
    // Validate address data
    if (!orderData.customer_address || !orderData.customer_city || !orderData.customer_zip) {
      console.log("⚠️ Incomplete address data, skipping save");
      return false;
    }

    console.log("💾 Saving delivery address for customer:", customerId);

    // Check if address already exists
    const { data: existingAddress } = await supabaseServer
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .eq("address", orderData.customer_address)
      .eq("city", orderData.customer_city)
      .eq("zip", orderData.customer_zip)
      .maybeSingle();

    if (existingAddress) {
      console.log("✅ Address already exists, updating instructions if needed");

      if (orderData.delivery_instructions && orderData.delivery_instructions !== existingAddress.delivery_instructions) {
        await supabaseServer
          .from("customer_addresses")
          .update({
            delivery_instructions: orderData.delivery_instructions,
          })
          .eq("id", existingAddress.id);
      }
      return true;
    }

    // Determine if this should be default address
    const { data: existingAddresses } = await supabaseServer.from("customer_addresses").select("id").eq("customer_id", customerId);

    const isFirstAddress = !existingAddresses || existingAddresses.length === 0;

    // Create new address
    const newAddress: InsertCustomerAddress = {
      customer_id: customerId,
      restaurant_id: orderData.restaurant_id,
      customer_phone: orderData.customer_phone!,
      customer_name: orderData.customer_name!,
      customer_email: orderData.customer_email,
      address: orderData.customer_address,
      city: orderData.customer_city,
      zip: orderData.customer_zip,
      delivery_instructions: orderData.delivery_instructions,
      is_default: isFirstAddress,
    };

    const { error: saveError } = await supabaseServer.from("customer_addresses").insert(newAddress);

    if (saveError) {
      console.error("❌ Error saving address:", saveError);
      return false;
    }

    console.log("✅ Successfully saved new address");
    return true;
  } catch (error) {
    console.error("❌ Unexpected error saving address:", error);
    return false;
  }
}

async function handleCustomerCreation(orderData: any): Promise<string | null> {
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

      const newCustomer = {
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

async function updateCustomerStats(customerId: string, orderTotal: number) {
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

/**
 * Log Order Analytics
 *
 * Logs order data for business analytics and insights.
 */
async function logOrderAnalytics(
  order: {
    id: string;
    order_number: string;
    restaurant_id: string;
    order_type: string;
  },
  items: EnhancedOrderItem[]
) {
  try {
    // Calculate analytics data
    const analytics = {
      orderId: order.id,
      orderNumber: order.order_number,
      restaurantId: order.restaurant_id,
      orderType: order.order_type,
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      hasCustomizations: items.some(
        (item) =>
          (item.selectedToppings && item.selectedToppings.length > 0) || (item.selectedModifiers && item.selectedModifiers.length > 0)
      ),
      customizedItems: items.filter(
        (item) =>
          (item.selectedToppings && item.selectedToppings.length > 0) || (item.selectedModifiers && item.selectedModifiers.length > 0)
      ).length,
      averageItemPrice: items.reduce((sum, item) => sum + item.unitPrice, 0) / items.length,
      timestamp: new Date().toISOString(),
    };

    console.log("📈 Order analytics:", analytics);

    // In a production system, you might want to store this in a separate
    // analytics table or send it to an analytics service
  } catch (error) {
    console.error("⚠️ Error logging analytics:", error);
  }
}

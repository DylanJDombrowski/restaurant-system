import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, OrderWithItems, InsertOrder, InsertOrderItem, InsertCustomer, InsertCustomerAddress } from "@/lib/types";

/**
 * Interface for incoming order item data
 *
 * This solves the TypeScript 'any' error by properly typing our order items.
 * Think of this like creating a clear specification for what each item
 * in an order should contain.
 */
interface IncomingOrderItem {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string;
}

// GET handler - existing functionality
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<OrderWithItems[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");
    const statuses = searchParams.get("statuses");
    const limit = searchParams.get("limit");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST handler - enhanced version with proper typing
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<OrderWithItems>>> {
  try {
    console.log("=== Creating New Order ===");

    const body = await request.json();
    console.log("Request body:", body);

    const { orderData, orderItems } = body;

    if (!orderData || !orderItems) {
      return NextResponse.json({ error: "Missing orderData or orderItems" }, { status: 400 });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();
    console.log("Generated order number:", orderNumber);

    /**
     * Step 1: Enhanced Customer Handling
     *
     * This improved version ensures we always create or find a customer
     * before processing the order. Think of this like checking someone in
     * at the front desk before seating them - we want their record ready
     * before we start taking their order details.
     */
    let customerId = null;
    if (orderData.customer_phone) {
      customerId = await handleCustomerWithBetterErrorHandling(orderData);
      console.log("Customer handled, ID:", customerId);
    }

    // Create the order
    const orderInsert: InsertOrder = {
      ...orderData,
      order_number: orderNumber,
      customer_id: customerId,
    };

    console.log("Inserting order:", orderInsert);

    const { data: order, error: orderError } = await supabaseServer.from("orders").insert(orderInsert).select().single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json({ error: `Failed to create order: ${orderError.message}` }, { status: 500 });
    }

    console.log("Order created successfully:", order);

    /**
     * Step 2: Enhanced Address Saving
     *
     * This is where the magic happens. We save the delivery address
     * with comprehensive error handling and validation. Think of this
     * like updating a customer's address book - we want to make sure
     * we capture this information properly for future orders.
     */
    if (order.order_type === "delivery" && customerId && order.customer_address) {
      console.log("Attempting to save delivery address...");
      const addressSaved = await handleDeliveryAddressWithErrorHandling(customerId, orderData);

      if (addressSaved) {
        console.log("✅ Delivery address saved successfully");
      } else {
        console.log("⚠️ Delivery address could not be saved (order still successful)");
      }
    }

    // Create order items with proper typing
    const orderItemsToInsert: InsertOrderItem[] = orderItems.map((item: IncomingOrderItem) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      special_instructions: item.specialInstructions || null,
    }));

    console.log("Inserting order items:", orderItemsToInsert);

    const { data: createdOrderItems, error: itemsError } = await supabaseServer.from("order_items").insert(orderItemsToInsert).select(`
        *,
        menu_items(id, name, description, base_price)
      `);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Rollback the order if items creation fails
      await supabaseServer.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: `Failed to create order items: ${itemsError.message}` }, { status: 500 });
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

    console.log("✅ Order creation completed successfully");

    return NextResponse.json({
      data: completeOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("❌ Unexpected error creating order:", error);
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
 * Enhanced Customer Handling with Better Error Logging
 *
 * This version provides much more detailed logging and error handling
 * to help us understand what's happening with customer creation and lookup.
 */
async function handleCustomerWithBetterErrorHandling(orderData: InsertOrder): Promise<string | null> {
  try {
    console.log("🔍 Looking up customer with phone:", orderData.customer_phone);

    // Clean phone number for more flexible matching
    const cleanPhone = (orderData.customer_phone ?? "").replace(/\D/g, "");
    console.log("Cleaned phone number:", cleanPhone);

    // Try to find existing customer with multiple phone format variations
    const { data: existingCustomer, error: lookupError } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("restaurant_id", orderData.restaurant_id)
      .or(`phone.eq.${orderData.customer_phone},phone.eq.${cleanPhone},phone.eq.+1${cleanPhone}`)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no customer found

    if (lookupError) {
      console.error("❌ Error during customer lookup:", lookupError);
      // Continue with customer creation if lookup fails
    }

    if (existingCustomer) {
      console.log("✅ Found existing customer:", {
        id: existingCustomer.id,
        name: existingCustomer.name,
        total_orders: existingCustomer.total_orders,
      });

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
        console.log("📝 Updating customer with new information:", updates);
        const { error: updateError } = await supabaseServer
          .from("customers")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCustomer.id);

        if (updateError) {
          console.error("⚠️ Error updating customer:", updateError);
        } else {
          console.log("✅ Customer updated successfully");
        }
      }

      return existingCustomer.id;
    }

    // Create new customer
    if (orderData.customer_name && orderData.customer_phone) {
      console.log("👤 Creating new customer...");

      const newCustomer: InsertCustomer = {
        restaurant_id: orderData.restaurant_id,
        phone: orderData.customer_phone,
        name: orderData.customer_name,
        email: orderData.customer_email || null,
        loyalty_points: 0,
        total_orders: 0,
        total_spent: 0,
      };

      console.log("New customer data:", newCustomer);

      const { data: customer, error: createError } = await supabaseServer.from("customers").insert(newCustomer).select().single();

      if (createError) {
        console.error("❌ Error creating customer:", createError);
        console.error("Full error details:", {
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code,
        });
        return null;
      }

      console.log("✅ Created new customer:", {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      });
      return customer.id;
    }

    console.log("⚠️ Insufficient customer information to create record");
    return null;
  } catch (error) {
    console.error("❌ Unexpected error handling customer:", error);
    return null;
  }
}

/**
 * Robust Delivery Address Handling with Comprehensive Error Checking
 *
 * This enhanced version ensures addresses are saved reliably and provides
 * detailed logging to help troubleshoot any issues. Think of this like
 * maintaining a customer's address book - we want to be thorough and
 * handle edge cases gracefully.
 *
 * Note: Removed the unused orderId parameter that was causing linting errors.
 */
async function handleDeliveryAddressWithErrorHandling(customerId: string, orderData: InsertOrder): Promise<boolean> {
  try {
    // Validate we have the required address information
    if (!orderData.customer_address || !orderData.customer_city || !orderData.customer_zip) {
      console.log("⚠️ Incomplete address information, skipping address save:", {
        address: !!orderData.customer_address,
        city: !!orderData.customer_city,
        zip: !!orderData.customer_zip,
      });
      return false;
    }

    console.log("💾 Saving delivery address for customer:", customerId);
    console.log("Address details:", {
      address: orderData.customer_address,
      city: orderData.customer_city,
      zip: orderData.customer_zip,
      instructions: orderData.delivery_instructions,
    });

    // Check if this exact address already exists for this customer
    const { data: existingAddress, error: checkError } = await supabaseServer
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .eq("address", orderData.customer_address)
      .eq("city", orderData.customer_city)
      .eq("zip", orderData.customer_zip)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking for existing address:", checkError);
      // Continue with creation attempt despite check error
    }

    if (existingAddress) {
      console.log("✅ Address already exists for customer, skipping creation");

      // Update the instructions if they're different or were empty
      if (orderData.delivery_instructions && orderData.delivery_instructions !== existingAddress.delivery_instructions) {
        console.log("📝 Updating delivery instructions for existing address");

        const { error: updateError } = await supabaseServer
          .from("customer_addresses")
          .update({
            delivery_instructions: orderData.delivery_instructions,
          })
          .eq("id", existingAddress.id);

        if (updateError) {
          console.error("⚠️ Error updating address instructions:", updateError);
        } else {
          console.log("✅ Address instructions updated");
        }
      }

      return true;
    }

    // Determine if this should be the default address
    const { data: existingAddresses, error: countError } = await supabaseServer
      .from("customer_addresses")
      .select("id")
      .eq("customer_id", customerId);

    if (countError) {
      console.error("⚠️ Error checking existing addresses count:", countError);
    }

    const isFirstAddress = !countError && (!existingAddresses || existingAddresses.length === 0);
    console.log("Is this the customer's first address?", isFirstAddress);

    // Create new address record
    const newAddress: InsertCustomerAddress = {
      customer_id: customerId,
      restaurant_id: orderData.restaurant_id,
      customer_phone: orderData.customer_phone!,
      customer_name: orderData.customer_name!,
      customer_email: orderData.customer_email,
      address: orderData.customer_address,
      city: orderData.customer_city,
      zip: orderData.customer_zip,
      delivery_instructions: orderData.delivery_instructions || null,
      is_default: isFirstAddress, // First address becomes default
    };

    console.log("Creating new address:", newAddress);

    const { data: savedAddress, error: saveError } = await supabaseServer.from("customer_addresses").insert(newAddress).select().single();

    if (saveError) {
      console.error("❌ Error saving new address:", saveError);
      console.error("Full error details:", {
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint,
        code: saveError.code,
      });
      console.error("Data that failed to insert:", newAddress);
      return false;
    }

    console.log("✅ Successfully saved new address:", {
      id: savedAddress.id,
      address: savedAddress.address,
      is_default: savedAddress.is_default,
    });

    return true;
  } catch (error) {
    console.error("❌ Unexpected error saving delivery address:", error);
    return false;
  }
}

/**
 * Update Customer Statistics
 *
 * This function handles updating customer loyalty points and statistics.
 * It includes fallback logic in case the database RPC function isn't available.
 */
async function updateCustomerStats(customerId: string, orderTotal: number) {
  try {
    console.log("📊 Updating customer stats for:", customerId);

    // Calculate loyalty points (1 point per dollar)
    const pointsEarned = Math.floor(orderTotal);

    // Use manual update approach for reliability
    const { data: customer, error: fetchError } = await supabaseServer
      .from("customers")
      .select("total_orders, total_spent, loyalty_points")
      .eq("id", customerId)
      .single();

    if (fetchError || !customer) {
      console.error("❌ Error fetching customer for stats update:", fetchError);
      return;
    }

    const { error: updateError } = await supabaseServer
      .from("customers")
      .update({
        total_orders: (customer.total_orders ?? 0) + 1,
        total_spent: (customer.total_spent ?? 0) + orderTotal,
        loyalty_points: (customer.loyalty_points ?? 0) + pointsEarned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (updateError) {
      console.error("❌ Error updating customer stats:", updateError);
      return;
    }

    // Log loyalty transaction
    const { error: loyaltyError } = await supabaseServer.from("loyalty_transactions").insert({
      customer_id: customerId,
      points_earned: pointsEarned,
      points_redeemed: 0,
      transaction_type: "earned",
      description: `Order reward: ${pointsEarned} points`,
    });

    if (loyaltyError) {
      console.error("⚠️ Error logging loyalty transaction:", loyaltyError);
    }

    console.log("✅ Customer stats updated successfully:", {
      points_earned: pointsEarned,
      new_total_orders: (customer.total_orders ?? 0) + 1,
    });
  } catch (error) {
    console.error("❌ Unexpected error updating customer stats:", error);
  }
}

/**
 * Generate Order Number
 *
 * Creates a unique order number using timestamp and random elements.
 * This ensures each order has a human-readable identifier.
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `ORD-${timestamp}-${random}`;
}

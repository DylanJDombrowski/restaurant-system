// src/app/api/customers/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { RecentCustomer } from "@/lib/types/loyalty";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Loading recent customers for restaurant:", restaurantId);

    // Get customers who have placed orders in the last 30 days
    const { data: recentCustomers, error } = await supabaseServer
      .from("customers")
      .select(
        `
        id,
        name,
        phone,
        loyalty_points,
        total_orders,
        last_order_date,
        updated_at
      `
      )
      .eq("restaurant_id", restaurantId)
      .not("last_order_date", "is", null)
      .gte(
        "last_order_date",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ) // Last 30 days
      .order("last_order_date", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading recent customers:", error);
      return NextResponse.json(
        { error: "Failed to load recent customers" },
        { status: 500 }
      );
    }

    const formattedCustomers: RecentCustomer[] = (recentCustomers || []).map(
      (customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        last_order_date: customer.last_order_date || customer.updated_at,
        loyalty_points: customer.loyalty_points,
        total_orders: customer.total_orders,
      })
    );

    console.log("✅ Found", formattedCustomers.length, "recent customers");

    return NextResponse.json({
      data: formattedCustomers,
      message: `Found ${formattedCustomers.length} recent customers`,
    });
  } catch (error) {
    console.error("💥 Error in recent customers API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// src/app/api/admin/customers/search/route.ts
export async function GET_ADMIN_SEARCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const restaurantId = searchParams.get("restaurant_id");

    if (!query || !restaurantId) {
      return NextResponse.json(
        { error: "query and restaurant_id are required" },
        { status: 400 }
      );
    }

    console.log("🔍 Admin customer search:", { query, restaurantId });

    // Search customers by name, phone, or email
    const { data: customers, error } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .order("total_spent", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error searching customers:", error);
      return NextResponse.json(
        { error: "Failed to search customers" },
        { status: 500 }
      );
    }

    console.log(
      "✅ Found",
      customers?.length || 0,
      "customers matching search"
    );

    return NextResponse.json({
      data: customers || [],
      message: `Found ${customers?.length || 0} customers matching "${query}"`,
    });
  } catch (error) {
    console.error("💥 Error in admin customer search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// src/app/api/admin/customers/[id]/transactions/route.ts
export async function GET_TRANSACTIONS(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    console.log("📊 Loading transactions for customer:", customerId);

    const { data: transactions, error } = await supabaseServer
      .from("loyalty_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading customer transactions:", error);
      return NextResponse.json(
        { error: "Failed to load transactions" },
        { status: 500 }
      );
    }

    console.log("✅ Found", transactions?.length || 0, "transactions");

    return NextResponse.json({
      data: transactions || [],
      message: `Found ${transactions?.length || 0} transactions`,
    });
  } catch (error) {
    console.error("💥 Error loading transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// src/app/api/admin/customers/[id]/adjust-points/route.ts
export async function POST_ADJUST_POINTS(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const body = await request.json();
    const { points_adjustment, reason, admin_notes } = body;

    if (!points_adjustment || !reason) {
      return NextResponse.json(
        { error: "points_adjustment and reason are required" },
        { status: 400 }
      );
    }

    console.log("⚙️ Adjusting points for customer:", {
      customerId,
      points_adjustment,
      reason,
    });

    // Get current customer
    const { data: customer, error: customerError } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const newPointsBalance = Math.max(
      0,
      customer.loyalty_points + points_adjustment
    );

    // Update customer points
    const { error: updateError } = await supabaseServer
      .from("customers")
      .update({
        loyalty_points: newPointsBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (updateError) {
      console.error("Error updating customer points:", updateError);
      return NextResponse.json(
        { error: "Failed to update customer points" },
        { status: 500 }
      );
    }

    // Log the adjustment
    const { error: transactionError } = await supabaseServer
      .from("loyalty_transactions")
      .insert({
        customer_id: customerId,
        points_earned: points_adjustment > 0 ? points_adjustment : 0,
        points_redeemed:
          points_adjustment < 0 ? Math.abs(points_adjustment) : 0,
        transaction_type: "adjusted",
        description: `Admin adjustment: ${reason}${
          admin_notes ? ` - ${admin_notes}` : ""
        }`,
      });

    if (transactionError) {
      console.error("Error logging adjustment transaction:", transactionError);
      // Don't fail the request if transaction logging fails
    }

    console.log("✅ Points adjustment successful:", {
      oldBalance: customer.loyalty_points,
      adjustment: points_adjustment,
      newBalance: newPointsBalance,
    });

    return NextResponse.json({
      data: {
        customer_id: customerId,
        old_points_balance: customer.loyalty_points,
        points_adjustment,
        new_points_balance: newPointsBalance,
        reason,
        admin_notes,
      },
      message: `Successfully adjusted points by ${points_adjustment}. New balance: ${newPointsBalance}`,
    });
  } catch (error) {
    console.error("💥 Error adjusting customer points:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// src/app/api/admin/customers/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

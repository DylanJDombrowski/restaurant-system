import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, Customer } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Customer[]>>> {
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
      return NextResponse.json(
        { error: "Failed to search customers", details: error.message },
        { status: 500 }
      );
    }

    const data = customers || [];

    return NextResponse.json({
      data: data,
      message: `Found ${data.length} customers matching "${query}"`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Create this file: src/app/api/admin/menu/items/[id]/variants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, MenuItemVariant } from "@/lib/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<MenuItemVariant[]>>> {
  try {
    const params = await context.params;
    const itemId = params.id;

    const { data, error } = await supabaseServer
      .from("menu_item_variants")
      .select("*")
      .eq("menu_item_id", itemId)
      .order("sort_order");

    if (error) {
      console.error("Error fetching variants:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

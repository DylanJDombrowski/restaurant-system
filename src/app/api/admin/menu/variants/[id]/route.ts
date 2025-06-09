// src/app/api/admin/menu/variants/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, MenuItemVariant } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<MenuItemVariant>>> {
  try {
    const params = await context.params;
    const variantId = params.id;
    const body = await request.json();

    const { data, error } = await supabaseServer
      .from("menu_item_variants")
      .update(body)
      .eq("id", variantId)
      .select()
      .single();

    if (error) {
      console.error("Error updating variant:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      message: "Variant updated successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const params = await context.params;
    const variantId = params.id;

    const { error } = await supabaseServer
      .from("menu_item_variants")
      .delete()
      .eq("id", variantId);

    if (error) {
      console.error("Error deleting variant:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: null,
      message: "Variant deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

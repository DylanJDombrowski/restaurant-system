// src/app/api/admin/menu/items/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, MenuItem } from "@/lib/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<MenuItem>>> {
  try {
    const params = await context.params;
    const itemId = params.id;

    // Fetch the specific menu item
    const { data, error } = await supabaseServer
      .from("menu_items")
      .select(
        `
        *,
        category:menu_categories(*)
      `
      )
      .eq("id", itemId)
      .single();

    if (error) {
      console.error("Error fetching menu item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add PATCH method for updating a menu item
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<MenuItem>>> {
  try {
    const params = await context.params;
    const itemId = params.id;
    const updates = await request.json();

    // Update the menu item
    const { data, error } = await supabaseServer
      .from("menu_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      console.error("Error updating menu item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      message: "Menu item updated successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add DELETE method for removing a menu item
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const params = await context.params;
    const itemId = params.id;

    // Delete the menu item
    const { error } = await supabaseServer
      .from("menu_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error deleting menu item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: null,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

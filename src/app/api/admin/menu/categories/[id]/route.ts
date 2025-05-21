// Create src/app/api/admin/menu/categories/[id]/route.ts for individual category operations
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, MenuCategory } from "@/lib/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<MenuCategory>>> {
  try {
    const params = await context.params;
    const categoryId = params.id;

    const { data, error } = await supabaseServer
      .from("menu_categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    if (error) {
      console.error("Error fetching category:", error);
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<MenuCategory>>> {
  try {
    const params = await context.params;
    const categoryId = params.id;
    const updates = await request.json();

    const { data, error } = await supabaseServer
      .from("menu_categories")
      .update(updates)
      .eq("id", categoryId)
      .select()
      .single();

    if (error) {
      console.error("Error updating category:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      message: "Category updated successfully",
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
    const categoryId = params.id;

    const { error } = await supabaseServer
      .from("menu_categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      console.error("Error deleting category:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: null,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

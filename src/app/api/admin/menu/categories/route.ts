// Update src/app/api/admin/menu/categories/route.ts to support POST
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, MenuCategory } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MenuCategory[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");

    let query = supabaseServer
      .from("menu_categories")
      .select("*")
      .order("sort_order");

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching menu categories:", error);
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

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MenuCategory>>> {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // If restaurant_id is not provided, get the first restaurant
    if (!body.restaurant_id) {
      const { data: restaurant } = await supabaseServer
        .from("restaurants")
        .select("id")
        .limit(1)
        .single();

      if (restaurant) {
        body.restaurant_id = restaurant.id;
      }
    }

    // Insert the category
    const { data, error } = await supabaseServer
      .from("menu_categories")
      .insert({
        name: body.name,
        description: body.description,
        restaurant_id: body.restaurant_id,
        sort_order: body.sort_order || 0,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating category:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

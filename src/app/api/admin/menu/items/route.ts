// src/app/api/admin/menu/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, MenuItem } from "@/lib/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MenuItem[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");
    const categoryId = searchParams.get("category_id");

    let query = supabaseServer.from("menu_items").select(`
      *,
      category:menu_categories(*)
    `);

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query.order("name");

    if (error) {
      console.error("Error fetching menu items:", error);
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
): Promise<NextResponse<ApiResponse<MenuItem>>> {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.category_id || !body.item_type) {
      return NextResponse.json(
        { error: "Name, category, and item type are required" },
        { status: 400 }
      );
    }

    // If restaurant_id is not provided, get the first restaurant
    // (In a multi-tenant system, you'd get this from authentication)
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

    // Insert the menu item
    const { data, error } = await supabaseServer
      .from("menu_items")
      .insert({
        name: body.name,
        description: body.description,
        restaurant_id: body.restaurant_id,
        category_id: body.category_id,
        item_type: body.item_type,
        base_price: body.base_price || 0,
        prep_time_minutes: body.prep_time_minutes || 15,
        is_available: body.is_available !== false,
        allows_custom_toppings: body.allows_custom_toppings || false,
        default_toppings_json: body.default_toppings_json || null,
        image_url: body.image_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating menu item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      message: "Menu item created successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

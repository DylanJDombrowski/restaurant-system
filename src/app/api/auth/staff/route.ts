import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, Staff, Restaurant } from "@/lib/types";

/**
 * Staff Authentication API - Bypasses RLS Issues
 *
 * This endpoint provides a way to fetch staff data for authentication
 * without running into Row Level Security timeout issues. It uses the
 * server-side Supabase client which has admin privileges.
 *
 * Security is maintained through Supabase's auth.getUser() verification.
 */

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<{ staff: Staff; restaurant: Restaurant }>>> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }

    // Extract the access token
    const accessToken = authHeader.substring(7);

    // Verify the user with Supabase Auth using the access token
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(accessToken);

    if (authError || !user) {
      console.error("Auth verification failed:", authError);
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    console.log("Fetching staff data for authenticated user:", user.id);

    // Fetch staff data using admin privileges (bypasses RLS)
    const { data: staff, error: staffError } = await supabaseServer
      .from("staff")
      .select("*")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (staffError) {
      console.error("Staff query error:", staffError);

      if (staffError.code === "PGRST116") {
        return NextResponse.json({ error: "No staff record found for this user" }, { status: 404 });
      }

      return NextResponse.json({ error: `Staff query failed: ${staffError.message}` }, { status: 500 });
    }

    if (!staff) {
      return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
    }

    // Fetch restaurant data
    const { data: restaurant, error: restaurantError } = await supabaseServer
      .from("restaurants")
      .select("*")
      .eq("id", staff.restaurant_id)
      .single();

    if (restaurantError) {
      console.error("Restaurant query error:", restaurantError);
      return NextResponse.json({ error: `Restaurant query failed: ${restaurantError.message}` }, { status: 500 });
    }

    console.log("Successfully loaded staff and restaurant data");

    return NextResponse.json({
      data: {
        staff,
        restaurant,
      },
      message: "Staff data loaded successfully",
    });
  } catch (error) {
    console.error("Unexpected error in staff auth API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";

interface SetPinRequest {
  pin?: string;
}

// Define the shape of the context object passed to the route handlers.
// This includes the dynamic route parameters.
interface RouteContext {
  params: {
    id: string; // The staff member's ID from the URL
  };
}

/**
 * PIN Management API for Staff
 *
 * This endpoint allows admins to set, check, and remove PINs for staff members.
 * It is a protected route that requires admin privileges.
 */

// GET: Check if a staff member has a PIN
export async function GET(request: NextRequest, { params }: RouteContext) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { id: staffId } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: adminStaff } = await supabase
      .from("staff")
      .select("restaurant_id, role")
      .eq("id", user.id)
      .single();

    if (!adminStaff || !["admin", "manager"].includes(adminStaff.role)) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    const { data: targetStaff } = await supabase
      .from("staff")
      .select("id, name, email, role, pin_hash")
      .eq("id", staffId)
      .eq("restaurant_id", adminStaff.restaurant_id)
      .single();

    if (!targetStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        has_pin: !!targetStaff.pin_hash,
      },
    });
  } catch (error) {
    console.error("PIN status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Set a new PIN for a staff member
export async function POST(request: NextRequest, { params }: RouteContext) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { id: staffId } = params;
    const body: SetPinRequest = await request.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: adminStaff } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!adminStaff || adminStaff.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    // Updated validation to require exactly 6 digits.
    if (!body.pin || !/^\d{6}$/.test(body.pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Hash the PIN with bcryptjs for secure storage.
    const pinHash = await hash(body.pin, 10);

    const { error: updateError } = await supabase
      .from("staff")
      .update({ pin_hash: pinHash })
      .eq("id", staffId);

    if (updateError) {
      console.error("PIN update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update PIN" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "PIN set successfully",
    });
  } catch (error) {
    console.error("PIN assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a PIN from a staff member
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { id: staffId } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: adminStaff } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!adminStaff || adminStaff.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase
      .from("staff")
      .update({ pin_hash: null })
      .eq("id", staffId);

    if (updateError) {
      console.error("PIN removal error:", updateError);
      return NextResponse.json(
        { error: "Failed to remove PIN" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "PIN removed successfully",
    });
  } catch (error) {
    console.error("PIN removal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

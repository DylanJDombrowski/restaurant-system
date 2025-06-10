// src/app/api/admin/staff/[id]/pin/route.ts - Fixed PIN Management API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { hash, compare } from "bcryptjs";
import { ApiResponse } from "@/lib/types";

interface SetPinRequest {
  pin?: string;
  regenerate?: boolean;
}

interface PinStatusResponse {
  has_pin: boolean;
  staff_id: string;
  staff_name: string;
  staff_email: string;
  pin_set_date?: string;
}

interface SetPinResponse {
  success: boolean;
  message: string;
  data: {
    staff_id: string;
    staff_name: string;
    staff_email: string;
    pin: string; // Only returned when setting a new PIN
    method: "custom" | "generated";
    assigned_by: string;
    assigned_at: string;
  };
}

/**
 * PIN Management API for Staff Members
 *
 * Handles 6-digit PIN creation, verification, and removal for staff authentication.
 * Only admins and managers can manage PINs for their restaurant's staff.
 */

// GET: Check if a staff member has a PIN set
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PinStatusResponse>>> {
  try {
    const params = await context.params;
    const staffId = params.id;

    console.log("🔍 Checking PIN status for staff:", staffId);

    // Get current user from Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify admin has permission to manage this staff member
    const { data: adminStaff, error: adminError } = await supabaseServer
      .from("staff")
      .select("restaurant_id, role, name, email")
      .eq("id", user.id)
      .single();

    if (adminError || !adminStaff) {
      console.error("❌ Admin staff lookup failed:", adminError);
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 403 }
      );
    }

    // Check admin role permissions
    if (!["admin", "manager"].includes(adminStaff.role)) {
      console.error("❌ Insufficient permissions:", adminStaff.role);
      return NextResponse.json(
        { error: "Admin or manager privileges required" },
        { status: 403 }
      );
    }

    // Get target staff member (must be in same restaurant)
    const { data: targetStaff, error: staffError } = await supabaseServer
      .from("staff")
      .select("id, name, email, role, pin_hash, created_at")
      .eq("id", staffId)
      .eq("restaurant_id", adminStaff.restaurant_id)
      .single();

    if (staffError || !targetStaff) {
      console.error("❌ Target staff not found:", staffError);
      return NextResponse.json(
        { error: "Staff member not found or access denied" },
        { status: 404 }
      );
    }

    const response: PinStatusResponse = {
      has_pin: !!targetStaff.pin_hash,
      staff_id: targetStaff.id,
      staff_name: targetStaff.name,
      staff_email: targetStaff.email,
      pin_set_date: targetStaff.pin_hash ? targetStaff.created_at : undefined,
    };

    console.log("✅ PIN status checked successfully");
    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("💥 Error checking PIN status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Set a 6-digit PIN for a staff member
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<SetPinResponse>>> {
  console.log("🔍 PIN API called");
  console.log("Headers:", Object.fromEntries(request.headers.entries()));
  try {
    const params = await context.params;
    const staffId = params.id;
    const body: SetPinRequest = await request.json();

    console.log("🔐 Setting PIN for staff:", staffId);

    // Get current user from Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();
    console.log("🔍 Supabase Auth Result:", {
      user: user ? { id: user.id, email: user.email } : null,
      error: authError,
    });

    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const { data: adminStaff, error: adminError } = await supabaseServer
      .from("staff")
      .select("restaurant_id, role, name, email")
      .eq("id", user.id)
      .single();

    if (adminError || !adminStaff) {
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 403 }
      );
    }

    if (!["admin", "manager"].includes(adminStaff.role)) {
      return NextResponse.json(
        { error: "Admin or manager privileges required" },
        { status: 403 }
      );
    }

    // Get target staff member
    const { data: targetStaff, error: staffError } = await supabaseServer
      .from("staff")
      .select("id, name, email, role, pin_hash")
      .eq("id", staffId)
      .eq("restaurant_id", adminStaff.restaurant_id)
      .single();

    if (staffError || !targetStaff) {
      return NextResponse.json(
        { error: "Staff member not found or access denied" },
        { status: 404 }
      );
    }

    // Generate or validate PIN
    let finalPin: string;
    let method: "custom" | "generated";

    if (body.pin) {
      // Custom PIN provided - validate it's exactly 6 digits
      if (!/^\d{6}$/.test(body.pin)) {
        return NextResponse.json(
          { error: "PIN must be exactly 6 digits (numbers only)" },
          { status: 400 }
        );
      }
      finalPin = body.pin;
      method = "custom";
    } else {
      // Generate random 6-digit PIN
      finalPin = Math.floor(100000 + Math.random() * 900000).toString();
      method = "generated";
    }

    console.log(
      `📱 ${method === "custom" ? "Custom" : "Generated"} PIN for ${
        targetStaff.name
      }`
    );

    // Check for PIN conflicts in the same restaurant
    const { data: existingPinStaff, error: conflictError } =
      await supabaseServer
        .from("staff")
        .select("id, name, email")
        .eq("restaurant_id", adminStaff.restaurant_id)
        .neq("id", staffId) // Exclude current staff member
        .not("pin_hash", "is", null);

    if (conflictError) {
      console.error("❌ Error checking PIN conflicts:", conflictError);
      return NextResponse.json(
        { error: "Failed to verify PIN uniqueness" },
        { status: 500 }
      );
    }

    // Verify PIN is unique by checking hashes (security best practice)
    if (existingPinStaff && existingPinStaff.length > 0) {
      for (const staff of existingPinStaff) {
        const { data: staffWithPin } = await supabaseServer
          .from("staff")
          .select("pin_hash")
          .eq("id", staff.id)
          .single();

        if (
          staffWithPin?.pin_hash &&
          (await compare(finalPin, staffWithPin.pin_hash))
        ) {
          console.error("❌ PIN conflict detected with:", staff.name);
          return NextResponse.json(
            {
              error:
                "This PIN is already in use by another staff member. Please choose a different PIN.",
              conflict_staff: staff.name,
            },
            { status: 409 }
          );
        }
      }
    }

    // Hash the PIN securely
    const pinHash = await hash(finalPin, 12); // Increased rounds for better security

    // Update staff record with new PIN
    const { error: updateError } = await supabaseServer
      .from("staff")
      .update({
        pin_hash: pinHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("❌ Failed to update PIN:", updateError);
      return NextResponse.json(
        { error: "Failed to save PIN to database" },
        { status: 500 }
      );
    }

    // Return success response with PIN (ONLY time we return the plain PIN)
    const response: SetPinResponse = {
      success: true,
      message: `6-digit PIN ${
        method === "custom" ? "set" : "generated"
      } successfully for ${targetStaff.name}`,
      data: {
        staff_id: targetStaff.id,
        staff_name: targetStaff.name,
        staff_email: targetStaff.email,
        pin: finalPin, // ⚠️ SECURITY: Only returned once during creation
        method,
        assigned_by: adminStaff.name,
        assigned_at: new Date().toISOString(),
      },
    };

    console.log("✅ PIN set successfully");
    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("💥 Error setting PIN:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a PIN from a staff member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    const params = await context.params;
    const staffId = params.id;

    console.log("🗑️ Removing PIN for staff:", staffId);

    // Get current user from Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const { data: adminStaff, error: adminError } = await supabaseServer
      .from("staff")
      .select("restaurant_id, role, name")
      .eq("id", user.id)
      .single();

    if (adminError || !adminStaff) {
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 403 }
      );
    }

    // Only admins can remove PINs (more restrictive than setting)
    if (adminStaff.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required to remove PINs" },
        { status: 403 }
      );
    }

    // Get target staff member
    const { data: targetStaff, error: staffError } = await supabaseServer
      .from("staff")
      .select("id, name, email, pin_hash")
      .eq("id", staffId)
      .eq("restaurant_id", adminStaff.restaurant_id)
      .single();

    if (staffError || !targetStaff) {
      return NextResponse.json(
        { error: "Staff member not found or access denied" },
        { status: 404 }
      );
    }

    // Check if staff member has a PIN to remove
    if (!targetStaff.pin_hash) {
      return NextResponse.json(
        { error: "Staff member does not have a PIN set" },
        { status: 400 }
      );
    }

    // Remove the PIN
    const { error: updateError } = await supabaseServer
      .from("staff")
      .update({
        pin_hash: null,
        is_logged_in: false, // Log them out for security
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("❌ Failed to remove PIN:", updateError);
      return NextResponse.json(
        { error: "Failed to remove PIN from database" },
        { status: 500 }
      );
    }

    console.log("✅ PIN removed successfully");
    return NextResponse.json({
      data: {
        message: `PIN removed successfully for ${targetStaff.name}. They will need a new PIN to log in.`,
      },
    });
  } catch (error) {
    console.error("💥 Error removing PIN:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

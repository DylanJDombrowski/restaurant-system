// src/app/api/admin/staff/[id]/pin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createHash } from "crypto";

interface SetPinRequest {
  pin?: string; // Optional - if not provided, generates random PIN
  regenerate?: boolean; // Force regenerate even if PIN exists
}

/**
 * PIN Management API for Staff
 *
 * This endpoint allows admins to set or generate PINs for staff members.
 * It handles both custom PIN assignment and automatic PIN generation.
 */

// GET: Check if staff member has a PIN
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params;

    // Get current user from session
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
      .select("restaurant_id, role")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (
      adminError ||
      !adminStaff ||
      !["admin", "manager"].includes(adminStaff.role)
    ) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    // Get target staff member
    const { data: targetStaff, error: staffError } = await supabaseServer
      .from("staff")
      .select("id, name, email, role, pin_hash, restaurant_id")
      .eq("id", staffId)
      .eq("restaurant_id", adminStaff.restaurant_id) // Same restaurant only
      .single();

    if (staffError || !targetStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        staff_id: targetStaff.id,
        name: targetStaff.name,
        email: targetStaff.email,
        role: targetStaff.role,
        has_pin: !!targetStaff.pin_hash,
        pin_set_date: targetStaff.pin_hash ? "Set" : null, // Don't expose actual dates for security
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

// POST: Set or generate PIN for staff member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params;
    const body: SetPinRequest = await request.json();

    // Get current user from session
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
      .eq("is_active", true)
      .single();

    if (
      adminError ||
      !adminStaff ||
      !["admin", "manager"].includes(adminStaff.role)
    ) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    // Get target staff member
    const { data: targetStaff, error: staffError } = await supabaseServer
      .from("staff")
      .select("id, name, email, role, pin_hash, restaurant_id")
      .eq("id", staffId)
      .eq("restaurant_id", adminStaff.restaurant_id)
      .single();

    if (staffError || !targetStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Check if PIN already exists and not forcing regeneration
    if (targetStaff.pin_hash && !body.regenerate && !body.pin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Staff member already has a PIN. Use regenerate=true to replace it.",
          data: {
            has_pin: true,
            staff_name: targetStaff.name,
          },
        },
        { status: 409 }
      );
    }

    let newPin: string;
    let pinHash: string;

    if (body.pin) {
      // Validate custom PIN
      if (!/^\d{6}$/.test(body.pin)) {
        return NextResponse.json(
          { error: "PIN must be exactly 6 digits" },
          { status: 400 }
        );
      }

      // Check if PIN is already in use by another staff member
      pinHash = createHash("sha256").update(body.pin).digest("hex");

      const { data: existingPin } = await supabaseServer
        .from("staff")
        .select("id, name")
        .eq("restaurant_id", adminStaff.restaurant_id)
        .eq("pin_hash", pinHash)
        .eq("is_active", true)
        .neq("id", staffId)
        .single();

      if (existingPin) {
        return NextResponse.json(
          {
            error: `PIN already in use by ${existingPin.name}`,
            conflict_staff: existingPin.name,
          },
          { status: 409 }
        );
      }

      newPin = body.pin;
    } else {
      // Generate random unique PIN
      let attempts = 0;
      const maxAttempts = 100;

      do {
        attempts++;
        if (attempts > maxAttempts) {
          return NextResponse.json(
            { error: "Unable to generate unique PIN. Please try again." },
            { status: 500 }
          );
        }

        // Generate random 6-digit PIN
        newPin = Math.floor(Math.random() * 1000000)
          .toString()
          .padStart(6, "0");
        pinHash = createHash("sha256").update(newPin).digest("hex");

        // Check if this PIN is already in use
        const { data: existingPin } = await supabaseServer
          .from("staff")
          .select("id")
          .eq("restaurant_id", adminStaff.restaurant_id)
          .eq("pin_hash", pinHash)
          .eq("is_active", true)
          .single();

        if (!existingPin) break; // PIN is unique
      } while (true);
    }

    // Update staff record with new PIN
    const { error: updateError } = await supabaseServer
      .from("staff")
      .update({
        pin_hash: pinHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("PIN update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update PIN" },
        { status: 500 }
      );
    }

    // Log the PIN assignment for audit
    console.log("📱 PIN assigned:", {
      admin: adminStaff.name,
      target_staff: targetStaff.name,
      staff_id: staffId,
      method: body.pin ? "custom" : "generated",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `PIN ${body.pin ? "set" : "generated"} successfully`,
      data: {
        staff_id: staffId,
        staff_name: targetStaff.name,
        staff_email: targetStaff.email,
        pin: newPin, // ONLY time the PIN is returned in plain text
        method: body.pin ? "custom" : "generated",
        assigned_by: adminStaff.name,
        assigned_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("PIN assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove PIN from staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params;

    // Get current user from session
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
      .eq("is_active", true)
      .single();

    if (adminError || !adminStaff || adminStaff.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required" },
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
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    if (!targetStaff.pin_hash) {
      return NextResponse.json({
        success: false,
        message: "Staff member does not have a PIN to remove",
      });
    }

    // Remove PIN
    const { error: updateError } = await supabaseServer
      .from("staff")
      .update({
        pin_hash: null,
        is_logged_in: false, // Force logout
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("PIN removal error:", updateError);
      return NextResponse.json(
        { error: "Failed to remove PIN" },
        { status: 500 }
      );
    }

    // Invalidate any active sessions for this staff member
    await supabaseServer
      .from("staff_sessions")
      .update({ is_active: false })
      .eq("staff_id", staffId);

    console.log("📱 PIN removed:", {
      admin: adminStaff.name,
      target_staff: targetStaff.name,
      staff_id: staffId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "PIN removed successfully",
      data: {
        staff_id: staffId,
        staff_name: targetStaff.name,
        removed_by: adminStaff.name,
        removed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("PIN removal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

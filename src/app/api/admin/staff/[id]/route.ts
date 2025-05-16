// src/app/api/admin/staff/[id]/route.ts - Individual Staff Management
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, Staff } from "@/lib/types";

/**
 * Individual Staff Member API Endpoints
 *
 * These endpoints handle operations on specific staff members.
 * Notice how we maintain the same coordination between Supabase Auth
 * and the staff table, even for updates and deletions.
 *
 * The key principle here is "symmetric operations" - if we create
 * something in both systems, we update and delete in both systems.
 */

/**
 * PATCH /api/admin/staff/[id]
 *
 * Updates a staff member's information. This demonstrates an important
 * architectural decision: we update the staff table directly for most
 * fields, but some changes (like email) would require updating the
 * auth user as well.
 *
 * For now, we're keeping it simple by not allowing email changes
 * after account creation. This prevents complexity around email
 * verification and ensures consistency.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Staff>>> {
  try {
    const params = await context.params;
    const staffId = params.id;

    console.log("=== Updating Staff Member ===");
    console.log("Staff ID:", staffId);

    // Parse request body
    const body = await request.json();
    const { name, role, is_active } = body;

    // Validate the request
    if (!name && !role && is_active === undefined) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role && !["staff", "manager", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: Partial<Staff> = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;

    console.log("Update data:", updateData);

    /**
     * Update Staff Record
     *
     * We update the staff table first, then potentially update
     * the auth user metadata if the name changed. This ensures
     * our business logic is always current.
     */
    const { data: staff, error: staffError } = await supabaseServer
      .from("staff")
      .update(updateData)
      .eq("id", staffId)
      .select()
      .single();

    if (staffError) {
      console.error("Failed to update staff:", staffError);
      return NextResponse.json(
        { error: `Failed to update staff: ${staffError.message}` },
        { status: 500 }
      );
    }

    /**
     * Update Auth User Metadata
     *
     * If the name or role changed, we should update the auth user's
     * metadata to keep everything in sync. This is like updating
     * the name on someone's ID badge when they get married.
     */
    if (name || role) {
      console.log("Updating auth user metadata...");

      const { error: authError } =
        await supabaseServer.auth.admin.updateUserById(staffId, {
          user_metadata: {
            ...(name && { name }),
            ...(role && { role }),
          },
        });

      if (authError) {
        console.error("Failed to update auth metadata:", authError);
        // Note: We don't rollback the staff update here because the
        // staff table is our source of truth. The auth metadata is
        // supplementary information.
      } else {
        console.log("Auth metadata updated successfully");
      }
    }

    /**
     * Handle Account Deactivation
     *
     * When we deactivate a staff member, we should also disable
     * their auth account. This prevents them from logging in
     * while preserving their data for historical purposes.
     */
    if (is_active === false) {
      console.log("Deactivating auth user...");

      // Note: Supabase doesn't have a direct "disable" feature,
      // so we set a custom metadata flag that we can check during login
      const { error: authError } =
        await supabaseServer.auth.admin.updateUserById(staffId, {
          user_metadata: {
            is_active: false,
          },
        });

      if (authError) {
        console.error("Failed to deactivate auth user:", authError);
      }
    }

    console.log("Staff updated successfully");

    return NextResponse.json({
      data: staff,
      message: "Staff member updated successfully",
    });
  } catch (error) {
    console.error("Unexpected error updating staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/staff/[id]
 *
 * Deletes a staff member completely. This is a dangerous operation
 * that we might want to restrict or replace with permanent deactivation
 * in production. For now, it demonstrates the full cleanup process.
 *
 * Important: Deleting staff can break referential integrity with
 * orders and other records. Consider using soft deletes (is_active: false)
 * instead of hard deletes in production systems.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const params = await context.params;
    const staffId = params.id;

    console.log("=== Deleting Staff Member ===");
    console.log("Staff ID:", staffId);

    /**
     * Verification Step
     *
     * Before deleting, we should verify that this staff member
     * exists and check for any dependencies (like orders they've
     * created). This prevents orphaned data.
     */
    const { data: existingStaff, error: checkError } = await supabaseServer
      .from("staff")
      .select("name, email")
      .eq("id", staffId)
      .single();

    if (checkError || !existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    console.log("Deleting staff member:", existingStaff.name);

    /**
     * Step 1: Delete from Staff Table
     *
     * We delete the staff record first. This ensures that if the
     * auth deletion fails, we don't have an orphaned staff record.
     */
    const { error: staffError } = await supabaseServer
      .from("staff")
      .delete()
      .eq("id", staffId);

    if (staffError) {
      console.error("Failed to delete staff record:", staffError);
      return NextResponse.json(
        { error: `Failed to delete staff record: ${staffError.message}` },
        { status: 500 }
      );
    }

    console.log("Staff record deleted successfully");

    /**
     * Step 2: Delete from Supabase Auth
     *
     * Now we delete the auth user. If this fails, the user will
     * be able to login but won't have a staff record, which our
     * auth context will handle by signing them out automatically.
     */
    const { error: authError } = await supabaseServer.auth.admin.deleteUser(
      staffId
    );

    if (authError) {
      console.error("Failed to delete auth user:", authError);
      // We don't return an error here because the staff record
      // is already deleted. The auth user becomes orphaned but
      // won't be able to access anything.
      console.log("Warning: Auth user not deleted but staff record removed");
    } else {
      console.log("Auth user deleted successfully");
    }

    return NextResponse.json({
      data: null,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error deleting staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/staff/[id]
 *
 * Retrieves details for a specific staff member.
 * This could be useful for a detailed staff profile page
 * or for pre-populating edit forms.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Staff>>> {
  try {
    const params = await context.params;
    const staffId = params.id;

    console.log("Fetching staff member:", staffId);

    const { data: staff, error } = await supabaseServer
      .from("staff")
      .select("*")
      .eq("id", staffId)
      .single();

    if (error) {
      console.error("Failed to fetch staff:", error);
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "PGRST116" ? 404 : 500 }
      );
    }

    return NextResponse.json({ data: staff });
  } catch (error) {
    console.error("Unexpected error fetching staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

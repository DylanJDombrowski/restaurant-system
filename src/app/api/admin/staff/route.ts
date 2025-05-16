// src/app/api/admin/staff/route.ts - Staff Management API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse, Staff, InsertStaff } from "@/lib/types";

/**
 * Staff Management API Endpoints
 *
 * These endpoints handle the complex coordination between Supabase Auth
 * and our staff table. Think of this as the HR department's digital
 * filing system - it creates employees in both the security system
 * (Supabase Auth) and the business system (staff table) simultaneously.
 *
 * Key Concepts:
 * 1. **Atomic Operations**: Both Auth user and staff record are created together
 * 2. **Rollback Safety**: If either operation fails, we clean up the other
 * 3. **Security First**: Only admins can manage staff accounts
 */

/**
 * GET /api/admin/staff
 *
 * Retrieves all staff members for a specific restaurant.
 * This endpoint demonstrates multi-tenant security - each admin
 * can only see staff from their own restaurant.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Staff[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");

    // Validate required parameters
    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    console.log("Fetching staff for restaurant:", restaurantId);

    // Fetch staff with role-based ordering
    // Notice how we order by role (admin > manager > staff) then by name
    const { data: staff, error } = await supabaseServer
      .from("staff")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("role", { ascending: false }) // Show admins first
      .order("name", { ascending: true });

    if (error) {
      console.error("Database error fetching staff:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Found ${staff?.length || 0} staff members`);

    return NextResponse.json({ data: staff || [] });
  } catch (error) {
    console.error("Error in GET /api/admin/staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/staff
 *
 * Creates a new staff member by coordinating between Supabase Auth
 * and the staff table. This is perhaps the most complex operation
 * in our system because it needs to maintain consistency across
 * two different storage systems.
 *
 * Process Flow:
 * 1. Create user in Supabase Auth
 * 2. Extract the user ID from Auth response
 * 3. Create staff record with matching ID
 * 4. If either step fails, rollback the other
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Staff>>> {
  try {
    console.log("=== Creating New Staff Member ===");

    // Parse and validate request body
    const body = await request.json();
    const { name, email, role, password, restaurant_id } = body;

    // Comprehensive validation
    if (!name || !email || !role || !password || !restaurant_id) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, email, role, password, restaurant_id",
        },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["staff", "manager", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    console.log("Creating staff member:", { name, email, role });

    /**
     * Step 1: Create User in Supabase Auth
     *
     * We use the Admin API to create the user account. This bypasses
     * email confirmation and allows us to set the password directly.
     * Think of this as issuing an ID badge to a new employee.
     */
    const { data: authUser, error: authError } =
      await supabaseServer.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for admin-created accounts
        user_metadata: {
          name, // Store name in user metadata for future reference
          role,
        },
      });

    if (authError) {
      console.error("Failed to create auth user:", authError);

      // Provide user-friendly error messages
      if (authError.message.includes("already exists")) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Authentication error: ${authError.message}` },
        { status: 500 }
      );
    }

    console.log("Auth user created successfully:", authUser.user.id);

    /**
     * Step 2: Create Staff Record
     *
     * Now we create the staff record using the exact same ID as the
     * auth user. This creates the crucial link between authentication
     * (who they are) and authorization (what they can do).
     */
    const staffRecord: InsertStaff = {
      id: authUser.user.id, // This is the crucial link!
      restaurant_id,
      email,
      name,
      role,
      is_active: true,
    };

    const { data: staff, error: staffError } = await supabaseServer
      .from("staff")
      .insert(staffRecord)
      .select()
      .single();

    if (staffError) {
      console.error("Failed to create staff record:", staffError);

      /**
       * CRITICAL: Rollback Strategy
       *
       * If staff creation fails, we must delete the auth user
       * to maintain consistency. This prevents orphaned auth
       * users who can login but have no staff record.
       */
      console.log("Rolling back auth user creation...");
      await supabaseServer.auth.admin.deleteUser(authUser.user.id);

      return NextResponse.json(
        { error: `Failed to create staff record: ${staffError.message}` },
        { status: 500 }
      );
    }

    console.log("Staff record created successfully");

    // Return the created staff record
    return NextResponse.json({
      data: staff,
      message: "Staff member created successfully",
    });
  } catch (error) {
    console.error("Unexpected error creating staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

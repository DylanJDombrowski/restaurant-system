// src/app/api/admin/terminals/register/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type {
  TerminalRegistrationRequest,
  StaffRecord,
  RestaurantRecord,
  TerminalRegistrationRecord,
  StaffInfo,
  DeviceInfo,
} from "@/lib/types/pin-login";

/**
 * Terminal Registration API
 *
 * This endpoint creates an audit trail when devices are registered
 * as POS terminals for specific restaurants.
 */
export async function POST(request: NextRequest) {
  try {
    const body: TerminalRegistrationRequest = await request.json();
    const { restaurant_id, device_info } = body;

    // Input validation
    if (!restaurant_id || !device_info) {
      return NextResponse.json(
        { error: "restaurant_id and device_info are required" },
        { status: 400 }
      );
    }

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

    // Verify admin permissions for this restaurant
    const { data: adminStaff, error: adminError } = await supabaseServer
      .from("staff")
      .select("restaurant_id, role, name, email")
      .eq("id", user.id)
      .eq("restaurant_id", restaurant_id)
      .eq("is_active", true)
      .single();

    if (
      adminError ||
      !adminStaff ||
      !["admin", "manager"].includes(adminStaff.role)
    ) {
      return NextResponse.json(
        { error: "Admin privileges required for this restaurant" },
        { status: 403 }
      );
    }

    const typedAdminStaff = adminStaff as StaffRecord;

    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabaseServer
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const typedRestaurant = restaurant as RestaurantRecord;

    // Extract client IP and additional device info
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const enhancedDeviceInfo = {
      ...device_info,
      client_ip: clientIP,
      registration_timestamp: new Date().toISOString(),
      admin_user_id: user.id,
      admin_name: typedAdminStaff.name,
      admin_email: typedAdminStaff.email,
    };

    // Create terminal registration record
    const { data: registration, error: registrationError } =
      await supabaseServer
        .from("terminal_registrations")
        .insert({
          restaurant_id: restaurant_id,
          device_info: enhancedDeviceInfo,
          registered_by: user.id,
          registered_at: new Date().toISOString(),
          is_active: true,
          notes: `Terminal registered for ${typedRestaurant.name} by ${typedAdminStaff.name}`,
        })
        .select()
        .single();

    if (registrationError) {
      console.error("Terminal registration error:", registrationError);
      return NextResponse.json(
        { error: "Failed to create registration record" },
        { status: 500 }
      );
    }

    // Log successful registration
    console.log("📱 Terminal registered:", {
      registration_id: registration.id,
      restaurant: typedRestaurant.name,
      admin: typedAdminStaff.name,
      device_info: {
        userAgent: device_info.userAgent?.substring(0, 100) + "...", // Truncate for logging
        timestamp: device_info.timestamp,
        client_ip: clientIP,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Terminal registered successfully",
      data: {
        registration_id: registration.id,
        restaurant_name: typedRestaurant.name,
        registered_at: registration.registered_at,
        registered_by: typedAdminStaff.name,
        device_fingerprint: createDeviceFingerprint(device_info),
      },
    });
  } catch (error) {
    console.error("Terminal registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: List registered terminals for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id parameter required" },
        { status: 400 }
      );
    }

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

    // Verify permissions for this restaurant
    const { data: staff, error: staffError } = await supabaseServer
      .from("staff")
      .select("restaurant_id, role")
      .eq("id", user.id)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Access denied for this restaurant" },
        { status: 403 }
      );
    }

    // Get terminal registrations
    const { data: registrations, error: registrationsError } =
      await supabaseServer
        .from("terminal_registrations")
        .select(
          `
        id,
        device_info,
        registered_at,
        is_active,
        last_used_at,
        notes,
        registered_by_staff:staff!terminal_registrations_registered_by_fkey(name, email)
      `
        )
        .eq("restaurant_id", restaurantId)
        .order("registered_at", { ascending: false })
        .limit(50);

    if (registrationsError) {
      console.error("Error fetching registrations:", registrationsError);
      return NextResponse.json(
        { error: "Failed to fetch terminal registrations" },
        { status: 500 }
      );
    }

    // Format the response with safe device info
    const formattedRegistrations =
      registrations?.map((reg) => {
        const typedReg = reg as TerminalRegistrationRecord & {
          registered_by_staff: StaffInfo | StaffInfo[] | null;
        };

        // Handle the staff relationship - it might be an array or single object
        let staffName = "Unknown";
        if (typedReg.registered_by_staff) {
          if (Array.isArray(typedReg.registered_by_staff)) {
            staffName = typedReg.registered_by_staff[0]?.name || "Unknown";
          } else {
            staffName = typedReg.registered_by_staff.name || "Unknown";
          }
        }

        return {
          id: typedReg.id,
          registered_at: typedReg.registered_at,
          is_active: typedReg.is_active,
          last_used_at: typedReg.last_used_at,
          notes: typedReg.notes,
          registered_by: staffName,
          device_fingerprint: createDeviceFingerprint(typedReg.device_info),
          device_summary: {
            browser: extractBrowserInfo(typedReg.device_info?.userAgent),
            platform: extractPlatformInfo(typedReg.device_info?.userAgent),
            registration_time: typedReg.device_info?.timestamp,
          },
        };
      }) || [];

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: restaurantId,
        total_registrations: formattedRegistrations.length,
        active_registrations: formattedRegistrations.filter((r) => r.is_active)
          .length,
        registrations: formattedRegistrations,
      },
    });
  } catch (error) {
    console.error("Error fetching terminal registrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Helper Functions
 */

function createDeviceFingerprint(deviceInfo: DeviceInfo): string {
  // Create a simple fingerprint for device identification
  const fingerprint = [
    deviceInfo?.userAgent?.substring(0, 50),
    deviceInfo?.timestamp,
    deviceInfo?.client_ip,
  ].join("|");

  // Return a hash of the fingerprint
  return Buffer.from(fingerprint).toString("base64").substring(0, 12);
}

function extractBrowserInfo(userAgent?: string): string {
  if (!userAgent) return "Unknown";

  if (userAgent.includes("Safari") && userAgent.includes("Version")) {
    return "Safari";
  } else if (userAgent.includes("Chrome")) {
    return "Chrome";
  } else if (userAgent.includes("Firefox")) {
    return "Firefox";
  } else if (userAgent.includes("Edge")) {
    return "Edge";
  } else {
    return "Other";
  }
}

function extractPlatformInfo(userAgent?: string): string {
  if (!userAgent) return "Unknown";

  if (userAgent.includes("iPad")) {
    return "iPad";
  } else if (userAgent.includes("iPhone")) {
    return "iPhone";
  } else if (userAgent.includes("Android")) {
    return "Android";
  } else if (userAgent.includes("Windows")) {
    return "Windows";
  } else if (userAgent.includes("Mac")) {
    return "Mac";
  } else {
    return "Other";
  }
}

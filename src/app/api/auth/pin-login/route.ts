// src/app/api/auth/pin-login/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import type {
  PinLoginRequest,
  StaffRecord,
  RestaurantRecord,
} from "@/lib/types/pin-login";

/**
 * PIN Login API Endpoint
 *
 * This endpoint handles authentication via 6-digit PIN for registered terminals.
 * It provides secure, fast access for staff members without requiring email/password.
 */
export async function POST(request: NextRequest) {
  try {
    const body: PinLoginRequest = await request.json();
    const { pin, restaurant_id } = body;

    // Input validation
    if (!pin || !restaurant_id) {
      return NextResponse.json(
        { error: "PIN and restaurant_id are required" },
        { status: 400 }
      );
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Get client IP for logging
    const clientIP = getClientIP(request);

    // Rate limiting check
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    console.log("🔐 PIN login attempt for restaurant:", {
      restaurant_id,
      client_ip: clientIP,
    });
    // Query staff table for matching PIN and restaurant
    const { data: staffList, error: staffError } = await supabaseServer
      .from("staff")
      .select(
        "id, name, email, role, is_active, pin_hash, restaurant_id, last_login, created_at"
      )
      .eq("restaurant_id", restaurant_id)
      .eq("is_active", true)
      .not("pin_hash", "is", null);

    if (staffError) {
      console.error("❌ Database error fetching staff:", staffError);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 }
      );
    }

    if (!staffList || staffList.length === 0) {
      console.log("❌ No active staff with PINs found for this restaurant.");
      return NextResponse.json(
        { error: "Invalid PIN or inactive account" },
        { status: 401 }
      );
    }

    // Step 2: Iterate and compare the PIN against each hash
    let foundStaff: StaffRecord | null = null;
    for (const staff of staffList) {
      if (staff.pin_hash && (await compare(pin, staff.pin_hash))) {
        foundStaff = staff as StaffRecord;
        break; // Exit loop once a match is found
      }
    }

    // Step 3: Handle login failure or success
    if (!foundStaff) {
      console.log("❌ PIN login failed: No matching hash found.");
      // Generic error message to prevent information leakage
      return NextResponse.json(
        { error: "Invalid PIN or inactive account" },
        { status: 401 }
      );
    }

    const typedStaffData = foundStaff;

    // Load restaurant data
    const { data: restaurantData, error: restaurantError } =
      await supabaseServer
        .from("restaurants")
        .select("*")
        .eq("id", restaurant_id)
        .single();

    if (restaurantError || !restaurantData) {
      console.error("❌ Restaurant not found:", restaurantError);
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const typedRestaurantData = restaurantData as RestaurantRecord;

    // Update last login timestamp
    const { error: updateError } = await supabaseServer
      .from("staff")
      .update({
        last_login: new Date().toISOString(),
        is_logged_in: true,
      })
      .eq("id", typedStaffData.id);

    if (updateError) {
      console.warn("⚠️ Failed to update last login:", updateError);
      // Continue anyway - login can still succeed
    }

    // Create session token (JWT)
    const tokenPayload = {
      sub: typedStaffData.id,
      email: typedStaffData.email,
      role: typedStaffData.role,
      restaurant_id: typedStaffData.restaurant_id,
      iss: "pizza-mia-pos",
      aud: "staff",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 hours
    };

    const token = sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallback-secret"
    );

    // Log successful login for audit
    console.log("✅ PIN login successful:", {
      staff_id: typedStaffData.id,
      staff_name: typedStaffData.name,
      restaurant_id: typedStaffData.restaurant_id,
      role: typedStaffData.role,
      client_ip: clientIP,
      timestamp: new Date().toISOString(),
    });

    // Create session record
    try {
      await supabaseServer.from("staff_sessions").insert({
        staff_id: typedStaffData.id,
        terminal_id: `pin-${Date.now()}`, // Simple terminal ID
        login_method: "pin",
        device_info: {
          client_ip: clientIP,
          user_agent: request.headers.get("user-agent") || "unknown",
        },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      });
    } catch (sessionError) {
      console.warn("⚠️ Failed to create session record:", sessionError);
      // Continue anyway - auth can still succeed
    }

    // Return success response with user data
    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        staff: {
          id: typedStaffData.id,
          email: typedStaffData.email,
          name: typedStaffData.name,
          role: typedStaffData.role,
          restaurant_id: typedStaffData.restaurant_id,
          is_active: typedStaffData.is_active,
          created_at: typedStaffData.created_at,
          last_login: new Date().toISOString(),
        },
        restaurant: typedRestaurantData,
        session: {
          token,
          expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("💥 PIN login error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Login failed due to server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Rate Limiting Helper (Simple Implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Reset or initialize
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false; // Rate limit exceeded
  }

  // Increment count
  entry.count++;
  return true;
}

/**
 * Get Client IP Helper
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

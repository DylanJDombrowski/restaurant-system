import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    console.log("API route called - testing Supabase connection...");

    // Test the database connection
    const { data, error } = await supabaseServer
      .from("restaurants")
      .select("id, name")
      .limit(1);

    console.log("Supabase query result:", { data, error });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          error: "Database error",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant: data?.[0],
      message: "API and database working correctly",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { Restaurant, ApiResponse } from "@/lib/types";

export async function GET(): Promise<NextResponse<ApiResponse<Restaurant>>> {
  try {
    const { data, error } = await supabaseServer
      .from("restaurants")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching restaurant:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in restaurant API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

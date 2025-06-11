// src/app/api/admin/customers/[id]/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    const { data: transactions, error } = await supabaseServer
      .from("loyalty_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading customer transactions:", error);
      return NextResponse.json(
        { error: "Failed to load transactions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: transactions || [],
      message: `Found ${transactions?.length || 0} transactions`,
    });
  } catch (error) {
    console.error("💥 Error loading transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

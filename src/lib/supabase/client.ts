import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper function to generate order numbers
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `ORD-${timestamp}-${random}`;
}

// Keep only the test connection function for debugging
export async function testConnection() {
  try {
    const { error } = await supabase.from("restaurants").select("id").limit(1);

    return { success: !error, error: error?.message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

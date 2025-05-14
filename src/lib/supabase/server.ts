import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables:", {
    url: !!supabaseUrl,
    key: !!supabaseKey,
  });
  throw new Error("Missing Supabase environment variables");
}

// Create a server-side client
export const supabaseServer = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

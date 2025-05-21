import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export default async function HomePage() {
  // Fetch restaurant data server-side
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .single();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-red-50 py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to {restaurant?.name || "Pizza Mia"}
          </h1>
          <p className="text-xl text-gray-600 mb-8">PIZZA. CHICKEN. CATERING</p>
          <Link
            href="/customer/order"
            className="bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-red-700 transition"
          >
            Order Now
          </Link>
        </div>
      </section>
    </div>
  );
}

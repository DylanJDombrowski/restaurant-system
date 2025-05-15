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

      {/* Quick Stats (shows our database connection works) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-3xl font-bold text-red-600">15+</h3>
              <p className="text-gray-600">Years of Service</p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-red-600">1000+</h3>
              <p className="text-gray-600">Happy Customers</p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-red-600">50+</h3>
              <p className="text-gray-600">Pizza Varieties</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

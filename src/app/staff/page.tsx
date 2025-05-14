import { supabase } from "@/src/lib/supabase/client";

export default async function StaffDashboard() {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .single();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Staff Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Today's Orders Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Today&apos;s Orders
          </h2>
          <p className="text-3xl font-bold text-blue-600">12</p>
          <p className="text-gray-600 text-sm">+3 from yesterday</p>
        </div>

        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Revenue</h2>
          <p className="text-3xl font-bold text-green-600">$347</p>
          <p className="text-gray-600 text-sm">Today&apos;s total</p>
        </div>

        {/* Active Orders Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Active Orders
          </h2>
          <p className="text-3xl font-bold text-orange-600">3</p>
          <p className="text-gray-600 text-sm">Currently in kitchen</p>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Restaurant Info
        </h2>
        <p className="text-gray-600">
          Restaurant ID:{" "}
          <span className="font-mono text-sm">{restaurant?.id}</span>
        </p>
        <p className="text-gray-600">
          Created: {new Date(restaurant?.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

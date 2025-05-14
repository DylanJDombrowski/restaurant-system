import { supabase } from "@/lib/supabase/client";

export default async function AdminDashboard() {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .single();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Restaurant Overview */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Restaurant Details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <p className="font-medium">{restaurant?.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">ID</label>
              <p className="font-mono text-sm text-gray-700">
                {restaurant?.id}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Created</label>
              <p className="text-gray-700">
                {new Date(restaurant?.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            System Status
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Database</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                Connected
              </span>
            </div>
            <div className="flex justify-between">
              <span>Authentication</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                Active
              </span>
            </div>
            <div className="flex justify-between">
              <span>Real-time Updates</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

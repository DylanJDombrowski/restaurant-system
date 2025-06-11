// In src/app/admin/page.tsx
"use client";

import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

// New analytics component to be added to the admin dashboard
function DashboardAnalytics() {
  const [analytics, setAnalytics] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    availableItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISOString = today.toISOString();

        // Fetch today's orders
        const { data: todayOrders, error: ordersError } = await supabase
          .from("orders")
          .select("id, total")
          .gte("created_at", todayISOString);

        if (ordersError) throw ordersError;

        // Calculate today's revenue
        const todayRevenue = todayOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

        // Fetch active orders
        const { data: activeOrders, error: activeError } = await supabase
          .from("orders")
          .select("id")
          .in("status", ["confirmed", "preparing"]);

        if (activeError) throw activeError;

        // Fetch available menu items
        const { data: availableItems, error: itemsError } = await supabase.from("menu_items").select("id").eq("is_available", true);

        if (itemsError) throw itemsError;

        setAnalytics({
          todayOrders: todayOrders?.length || 0,
          todayRevenue,
          activeOrders: activeOrders?.length || 0,
          availableItems: availableItems?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
        <h3 className="text-sm font-medium text-stone-950">Today&apos;s Orders</h3>
        <p className="text-2xl font-bold text-stone-950">{loading ? "..." : analytics.todayOrders}</p>
        <p className="text-xs text-stone-700">Total orders today</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
        <h3 className="text-sm font-medium text-stone-950">Today&apos;s Revenue</h3>
        <p className="text-2xl font-bold text-stone-950">{loading ? "..." : `$${analytics.todayRevenue.toFixed(2)}`}</p>
        <p className="text-xs text-stone-700">Revenue today</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
        <h3 className="text-sm font-medium text-stone-950">Active Orders</h3>
        <p className="text-2xl font-bold text-stone-950">{loading ? "..." : analytics.activeOrders}</p>
        <p className="text-xs text-stone-700">In kitchen queue</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
        <h3 className="text-sm font-medium text-stone-950">Available Items</h3>
        <p className="text-2xl font-bold text-stone-950">{loading ? "..." : analytics.availableItems}</p>
        <p className="text-xs text-stone-700">Menu items</p>
      </div>
    </div>
  );
}

interface Restaurant {
  id: string;
  name: string;
  created_at: string;
  // Add other fields as needed
}

function RestaurantDetails() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRestaurant() {
      setLoading(true);
      const { data } = await supabase.from("restaurants").select("*").single();
      setRestaurant(data);
      setLoading(false);
    }
    fetchRestaurant();
  }, []);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-stone-950 mb-4">Restaurant Details</h2>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-stone-700">Name</label>
          <p className="font-medium text-stone-950">{restaurant?.name}</p>
        </div>
        <div>
          <label className="text-sm text-stone-700">ID</label>
          <p className="font-mono text-sm text-stone-950">{restaurant?.id}</p>
        </div>
        <div>
          <label className="text-sm text-stone-700">Created</label>
          <p className="text-stone-950">{restaurant?.created_at ? new Date(restaurant.created_at).toLocaleString() : ""}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-950 mb-8">Admin Dashboard</h1>

      {/* Analytics Section */}
      <DashboardAnalytics />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Restaurant Overview */}
        <RestaurantDetails />

        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-stone-950 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-stone-950">Database</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-950">Authentication</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-950">Real-time Updates</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

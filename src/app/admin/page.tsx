// In src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { supabase } from "@/lib/supabase/client";
import { AdminLogin } from "@/components/auth/AdminLogin";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";
import { LoadingScreen } from "@/components/ui/LoadingScreen"; // Using your renamed generic loader

// ============================================================================
// Dashboard Components (You can move these to their own files if you prefer)
// ============================================================================

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISOString = today.toISOString();

        const { data: todayOrders, error: ordersError } = await supabase
          .from("orders")
          .select("id, total")
          .gte("created_at", todayISOString);

        if (ordersError) throw ordersError;

        const todayRevenue =
          todayOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

        const { data: activeOrders, error: activeError } = await supabase
          .from("orders")
          .select("id")
          .in("status", ["confirmed", "preparing"]);

        if (activeError) throw activeError;

        const { data: availableItems, error: itemsError } = await supabase
          .from("menu_items")
          .select("id")
          .eq("is_available", true);

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

  if (loading) {
    // Using a simpler loading indicator for this small component
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-lg shadow-md h-24 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
        <h3 className="text-sm font-medium text-stone-950">
          Today&apos;s Orders
        </h3>
        <p className="text-2xl font-bold text-stone-950">
          {analytics.todayOrders}
        </p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
        <h3 className="text-sm font-medium text-stone-950">
          Today&apos;s Revenue
        </h3>
        <p className="text-2xl font-bold text-stone-950">
          ${analytics.todayRevenue.toFixed(2)}
        </p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
        <h3 className="text-sm font-medium text-stone-950">Active Orders</h3>
        <p className="text-2xl font-bold text-stone-950">
          {analytics.activeOrders}
        </p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
        <h3 className="text-sm font-medium text-stone-950">Available Items</h3>
        <p className="text-2xl font-bold text-stone-950">
          {analytics.availableItems}
        </p>
      </div>
    </div>
  );
}

interface Restaurant {
  id: string;
  name: string;
  created_at: string;
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
    return <LoadingScreen />;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-stone-950 mb-4">
        Restaurant Details
      </h2>
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
          <p className="text-stone-950">
            {restaurant?.created_at
              ? new Date(restaurant.created_at).toLocaleString()
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-950 mb-8">
        Admin Dashboard
      </h1>
      <DashboardAnalytics />
      <div className="grid lg:grid-cols-2 gap-8">
        <RestaurantDetails />
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-stone-950 mb-4">
            System Status
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-stone-950">Database</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-950">Authentication</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                Active
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-950">Real-time Updates</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// The Main Page Component - Acts as a Gatekeeper
// ============================================================================

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // This effect will run when the component mounts and whenever user or loading changes.
  // It ensures that if a user is already logged in, they are sent to the dashboard.
  // However, the primary check is the return logic below.
  useEffect(() => {
    if (!loading && user) {
      // Redirect to a more specific dashboard URL if you have one,
      // e.g., /admin/dashboard. For now, we render the dashboard directly.
    } else if (!loading && !user) {
      // If not loading and no user, the page will render the AdminLogin form.
      // No redirect is necessary here.
    }
  }, [user, loading, router]);

  // 1. While the auth state is being determined, show the Lottie animation.
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // 2. If loading is finished and there's no user, show the login form.
  if (!user) {
    return <AdminLogin />;
  }

  // 3. If loading is finished and there IS a user, show the admin dashboard.
  return <AdminDashboard />;
}

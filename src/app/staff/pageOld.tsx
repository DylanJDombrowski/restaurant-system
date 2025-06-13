"use client";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { MenuItemWithCategory, OrderWithItems, Restaurant } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StaffDashboard() {
  const [, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        // Get restaurant using API route
        const restaurantResponse = await fetch("/api/restaurants");
        if (!restaurantResponse.ok) {
          throw new Error(`Restaurant API error: ${restaurantResponse.status}`);
        }
        const restaurantData = await restaurantResponse.json();
        setRestaurant(restaurantData.data);

        // Get menu items count
        const menuResponse = await fetch(
          `/api/menu?restaurant_id=${restaurantData.data.id}&available_only=true`
        );
        if (!menuResponse.ok) {
          throw new Error(`Menu API error: ${menuResponse.status}`);
        }
        const menuData = await menuResponse.json();
        setMenuItems(menuData.data || []);

        // Get today's orders
        const ordersResponse = await fetch(
          `/api/orders?restaurant_id=${restaurantData.data.id}&limit=50`
        );
        if (!ordersResponse.ok) {
          throw new Error(`Orders API error: ${ordersResponse.status}`);
        }
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);
      } catch (error) {
        console.error("Error loading data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-lg font-semibold mb-4">
          Error Loading Dashboard
        </div>
        <p className="text-gray-900">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate today's stats
  const todayOrders = orders.filter(
    (order) =>
      new Date(order.created_at).toDateString() === new Date().toDateString()
  );

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const confirmedOrders = orders.filter(
    (order) => order.status === "confirmed"
  );
  const preparingOrders = orders.filter(
    (order) => order.status === "preparing"
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
        <Link
          href="/staff/orders"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Create New Order
        </Link>
      </div>

      {/* Dashboard Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Today&apos;s Orders
          </h2>
          <p className="text-3xl font-bold text-blue-600">
            {todayOrders.length}
          </p>
          <p className="text-gray-800 text-sm">Total orders today</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-orange-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Active Orders
          </h2>
          <p className="text-3xl font-bold text-orange-600">
            {confirmedOrders.length + preparingOrders.length}
          </p>
          <p className="text-gray-800 text-sm">In kitchen queue</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Available Items
          </h2>
          <p className="text-3xl font-bold text-purple-600">
            {menuItems.length}
          </p>
          <p className="text-gray-800 text-sm">Menu items</p>
        </div>
      </div>

      {/* Order Status Overview */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Order Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Order Status
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-900">Pending Confirmation</span>
              <div className="flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                  {pendingOrders.length}
                </span>
                {pendingOrders.length > 0 && (
                  <Link
                    href="/staff/orders"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Review →
                  </Link>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">In Progress (Kitchen)</span>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                  {confirmedOrders.length}
                </span>
                {confirmedOrders.length > 0 && (
                  <Link
                    href="/kitchen"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    View Kitchen →
                  </Link>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">Preparing</span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
                {preparingOrders.length}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/staff/orders"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-blue-700 transition-colors"
            >
              📝 Create New Order
            </Link>
            <Link
              href="/kitchen"
              className="block w-full bg-green-600 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-green-700 transition-colors"
            >
              👨‍🍳 View Kitchen Display
            </Link>
            <Link
              href="/admin"
              className="block w-full bg-purple-600 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-purple-700 transition-colors"
            >
              ⚙️ Admin Panel
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Orders
            </h2>
            <Link
              href="/staff/orders"
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              View All Orders →
            </Link>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-lg">No orders yet today</div>
                <p className="text-gray-800 text-sm mt-2">
                  Create your first order to get started!
                </p>
              </div>
            ) : (
              orders
                .slice(0, 10)
                .map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "preparing":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "ready":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-900 border-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-900 border-gray-200";
    }
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const orderTime = new Date(date);
    const diffInMinutes = Math.floor(
      (now.getTime() - orderTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      return `${diffInHours}h ago`;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-lg text-gray-900">
            Order #{order.order_number}
          </h4>
          <p className="text-sm text-gray-900">{timeAgo(order.created_at)}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(
            order.status
          )}`}
        >
          {order.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-900">Customer:</span>
          <p className="font-medium text-gray-900">{order.customer_name}</p>
          <p className="text-gray-900">{order.customer_phone}</p>
        </div>
        <div>
          <span className="text-gray-900">Order:</span>
          <p className="font-medium text-gray-900">{order.order_type}</p>
          <p className="text-green-600 font-bold">${order.total}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-900">
          {order.order_items?.length || 0} item
          {(order.order_items?.length || 0) !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

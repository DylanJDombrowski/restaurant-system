// src/app/kitchen/page.tsx - Enhanced with Real-time
"use client";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { supabase } from "@/lib/supabase/client";
import { OrderWithItems, Restaurant } from "@/lib/types";
import { useEffect, useState } from "react";

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  // Real-time connection status
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");

  useEffect(() => {
    async function initializeKitchen() {
      try {
        setError(null);

        // Get restaurant using API route
        const restaurantResponse = await fetch("/api/restaurants");
        if (!restaurantResponse.ok) {
          throw new Error(`Restaurant API error: ${restaurantResponse.status}`);
        }
        const restaurantData = await restaurantResponse.json();
        setRestaurant(restaurantData.data);

        console.log("Kitchen loading orders for restaurant:", restaurantData.data.id);

        // Load initial orders
        await loadOrders(restaurantData.data.id);

        // Set up real-time subscription
        console.log("Setting up real-time subscription...");

        const channel = supabase
          .channel("kitchen-orders-channel")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
              filter: `restaurant_id=eq.${restaurantData.data.id}`,
            },
            async (payload) => {
              console.log("Real-time order change:", payload);

              // Reload orders when any order changes
              await loadOrders(restaurantData.data.id);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "order_items",
            },
            async (payload) => {
              console.log("Real-time order item change:", payload);

              // Reload orders when order items change
              await loadOrders(restaurantData.data.id);
            }
          )
          .subscribe((status) => {
            console.log("Subscription status:", status);

            if (status === "SUBSCRIBED") {
              setConnectionStatus("connected");
              console.log("Real-time enabled! Kitchen will update automatically.");
            } else if (status === "CHANNEL_ERROR") {
              setConnectionStatus("error");
              console.error("Real-time connection failed");
            } else {
              setConnectionStatus("connecting");
            }
          });

        // Cleanup function
        return () => {
          console.log("Cleaning up real-time subscription");
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error("Error initializing kitchen:", error);
        setError(error instanceof Error ? error.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }

    initializeKitchen();
  }, []);

  async function loadOrders(restaurantId: string) {
    try {
      // Get orders with confirmed/preparing status
      const response = await fetch(`/api/orders?restaurant_id=${restaurantId}&statuses=confirmed,preparing`);

      if (!response.ok) {
        throw new Error(`Orders API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Kitchen orders loaded:", data.data);
      setOrders(data.data || []);
      setError(null);
    } catch (error) {
      console.error("Error loading orders:", error);
      setError(error instanceof Error ? error.message : "Failed to load orders");
    }
  }

  const markOrderReady = async (orderId: string) => {
    try {
      console.log("Marking order ready:", orderId);

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to update order:", errorData);
        throw new Error(errorData.error || "Failed to update order");
      }

      // With real-time enabled, the order will be removed automatically
      // But we can also remove it locally for immediate feedback
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      console.log("Order marked ready successfully");
    } catch (error) {
      console.error("Error updating order:", error);
      alert(`Error updating order: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="text-center py-16 text-white">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl text-red-400">Error Loading Kitchen Display</h2>
        <p className="text-gray-900 mt-2">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Active Orders</h1>
        <div className="flex gap-4">
          {/* Real-time connection indicator - NEW */}
          <div
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors
            ${connectionStatus === "connected" ? "bg-green-600" : connectionStatus === "error" ? "bg-red-600" : "bg-yellow-600"}`}
          >
            {connectionStatus === "connected" ? "🟢 Live Updates" : connectionStatus === "error" ? "🔴 Disconnected" : "🟡 Connecting..."}
          </div>

          <span className="bg-blue-600 px-3 py-1 rounded-full">{orders.length} Orders</span>

          <button
            onClick={() => restaurant && loadOrders(restaurant.id)}
            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded-full text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🍕</div>
          <h2 className="text-2xl text-gray-900">All caught up!</h2>
          <p className="text-gray-900 mt-2">No orders in queue</p>
          <p className="text-gray-900 mt-4 text-sm">
            {connectionStatus === "connected"
              ? "System is live - new orders will appear instantly"
              : `Looking for orders with status: confirmed or preparing`}
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <KitchenOrderCard key={order.id} order={order} onMarkReady={() => markOrderReady(order.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// Enhanced order card with visual improvements
function KitchenOrderCard({ order, onMarkReady }: { order: OrderWithItems; onMarkReady: () => void }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const orderAge = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);

  const handleMarkReady = async () => {
    setIsUpdating(true);
    try {
      await onMarkReady();
    } finally {
      // Small delay to show feedback
      setTimeout(() => setIsUpdating(false), 500);
    }
  };

  return (
    <div
      className={`bg-gray-800 p-6 rounded-lg border transition-all duration-300 hover:shadow-lg ${
        orderAge > 20 ? "border-red-500 shadow-red-500/20" : orderAge > 15 ? "border-orange-500 shadow-orange-500/20" : "border-gray-700"
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-yellow-400">#{order.order_number}</h3>
        <div className="text-right">
          <span
            className={`px-2 py-1 rounded text-sm font-semibold ${
              orderAge > 20 ? "bg-red-600 animate-pulse" : orderAge > 15 ? "bg-orange-600" : "bg-yellow-600"
            }`}
          >
            {orderAge} min ago
          </span>
          <p className="text-gray-900 text-xs mt-1">
            {order.order_type} • {order.status.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-white font-semibold">{order.customer_name}</p>
        <p className="text-gray-900 text-sm">{order.customer_phone}</p>
        {order.order_type === "delivery" && order.customer_address && (
          <p className="text-blue-400 text-sm mt-1">
            📍 {order.customer_address}, {order.customer_city}
          </p>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {order.order_items?.map((item) => (
          <div key={item.id} className="text-white">
            <span className="bg-blue-600 px-2 py-1 rounded text-sm font-bold mr-2">{item.quantity}x</span>
            <span className="font-medium">{item.menu_item?.name}</span>
            {item.special_instructions && <div className="text-yellow-400 text-sm ml-8 mt-1">📝 {item.special_instructions}</div>}
          </div>
        ))}
      </div>

      {order.special_instructions && (
        <div className="bg-yellow-900 border border-yellow-600 p-3 rounded mb-4">
          <p className="text-yellow-100 text-sm">
            <strong>Special Instructions:</strong>
          </p>
          <p className="text-yellow-200 text-sm mt-1">{order.special_instructions}</p>
        </div>
      )}

      <button
        onClick={handleMarkReady}
        disabled={isUpdating}
        className={`w-full py-3 rounded-md font-bold text-lg transition-all duration-200 ${
          isUpdating
            ? "bg-gray-600 text-gray-900 cursor-not-allowed"
            : "bg-green-600 text-white hover:bg-green-700 transform hover:scale-105"
        }`}
      >
        {isUpdating ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Updating...
          </span>
        ) : (
          "✅ Mark Ready"
        )}
      </button>
    </div>
  );
}

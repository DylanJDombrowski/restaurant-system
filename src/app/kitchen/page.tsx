"use client";
import { useEffect, useState } from "react";
import { getCurrentRestaurant } from "@/lib/supabase/client";
import { OrderWithItems } from "@/lib/types";

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const restaurant = await getCurrentRestaurant();

        // Get orders that need kitchen attention
        const response = await fetch(
          `/api/orders?restaurant_id=${restaurant.id}&status=confirmed&status=preparing`
        );
        const data = await response.json();
        setOrders(data.data || []);
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();

    // Refresh orders every 30 seconds
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const markOrderReady = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });

      if (!response.ok) throw new Error("Failed to update order");

      // Remove order from display
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-white">
        <div className="text-lg">Loading kitchen orders...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Active Orders</h1>
        <div className="flex gap-4">
          <span className="bg-green-600 px-3 py-1 rounded-full">
            Kitchen Online
          </span>
          <span className="bg-blue-600 px-3 py-1 rounded-full">
            {orders.length} Orders
          </span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🍕</div>
          <h2 className="text-2xl text-gray-400">All caught up!</h2>
          <p className="text-gray-500 mt-2">No orders in queue</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              onMarkReady={() => markOrderReady(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KitchenOrderCard({
  order,
  onMarkReady,
}: {
  order: OrderWithItems;
  onMarkReady: () => void;
}) {
  const orderAge = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / 60000
  );

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-yellow-400">
          #{order.order_number}
        </h3>
        <div className="text-right">
          <span
            className={`bg-yellow-600 px-2 py-1 rounded text-sm ${
              orderAge > 20
                ? "bg-red-600"
                : orderAge > 15
                ? "bg-orange-600"
                : "bg-yellow-600"
            }`}
          >
            {orderAge} min ago
          </span>
          <p className="text-gray-400 text-sm mt-1">{order.order_type}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-white font-semibold">{order.customer_name}</p>
        <p className="text-gray-400 text-sm">{order.customer_phone}</p>
      </div>

      <div className="space-y-2 mb-4">
        {order.order_items?.map((item) => (
          <div key={item.id} className="text-white">
            <span className="font-medium">{item.quantity}x</span>{" "}
            <span>{item.menu_item?.name}</span>
            {item.special_instructions && (
              <div className="text-yellow-400 text-sm ml-4">
                Note: {item.special_instructions}
              </div>
            )}
          </div>
        ))}
      </div>

      {order.special_instructions && (
        <div className="bg-yellow-900 p-2 rounded mb-4">
          <p className="text-yellow-100 text-sm">
            <strong>Special:</strong> {order.special_instructions}
          </p>
        </div>
      )}

      <button
        onClick={onMarkReady}
        className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 font-semibold"
      >
        Mark Ready
      </button>
    </div>
  );
}

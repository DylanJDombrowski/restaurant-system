"use client";
import { useEffect, useState } from "react";
import { getCurrentRestaurant } from "@/lib/supabase/client";
import { MenuItemWithCategory, Restaurant, OrderWithItems } from "@/lib/types";

export default function StaffOrdersPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Get restaurant
        const restaurantData = await getCurrentRestaurant();
        setRestaurant(restaurantData);

        // Get menu items
        const menuResponse = await fetch(
          `/api/menu?restaurant_id=${restaurantData.id}&available_only=true`
        );
        const menuData = await menuResponse.json();
        setMenuItems(menuData.data || []);

        // Get today's orders
        const ordersResponse = await fetch(
          `/api/orders?restaurant_id=${restaurantData.id}`
        );
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading menu and orders...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-gray-600">
          Restaurant: {restaurant?.name} | Today&apos;s Orders: {orders.length}{" "}
          | Available Items: {menuItems.length}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Creation */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Create New Order</h2>
          <OrderCreationForm
            menuItems={menuItems}
            restaurantId={restaurant?.id || ""}
            onOrderCreated={() => {
              // Refresh orders list
              window.location.reload();
            }}
          />
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {orders.length === 0 ? (
              <p className="text-gray-500">No orders yet today</p>
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

// Order Creation Form Component
function OrderCreationForm({
  menuItems,
  restaurantId,
  onOrderCreated,
}: {
  menuItems: MenuItemWithCategory[];
  restaurantId: string;
  onOrderCreated: () => void;
}) {
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      menuItem: MenuItemWithCategory;
      quantity: number;
    }>
  >([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = (menuItem: MenuItemWithCategory) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: string) => {
    setSelectedItems((prev) =>
      prev.filter((item) => item.menuItem.id !== menuItemId)
    );
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      )
    );
  };

  const calculateTotal = () => {
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.menuItem.base_price * item.quantity,
      0
    );
    const tax = subtotal * 0.08;
    const deliveryFee = orderType === "delivery" ? 3.99 : 0;
    return {
      subtotal,
      tax,
      deliveryFee,
      total: subtotal + tax + deliveryFee,
    };
  };

  const handleSubmit = async () => {
    if (
      selectedItems.length === 0 ||
      !customerInfo.name ||
      !customerInfo.phone
    ) {
      alert("Please add items and fill in customer information");
      return;
    }

    setIsSubmitting(true);
    try {
      const { subtotal, tax, deliveryFee, total } = calculateTotal();

      // Prepare order data
      const orderData = {
        restaurant_id: restaurantId,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || null,
        order_type: orderType,
        subtotal,
        tax_amount: tax,
        delivery_fee: deliveryFee,
        total,
        status: "pending" as const,
      };

      // Prepare order items
      const orderItems = selectedItems.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        unitPrice: item.menuItem.base_price,
        specialInstructions: null,
      }));

      // Submit order
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderData, orderItems }),
      });

      if (!response.ok) throw new Error("Failed to create order");

      // Reset form
      setSelectedItems([]);
      setCustomerInfo({ name: "", phone: "", email: "" });
      setOrderType("pickup");

      // Notify parent
      onOrderCreated();

      alert("Order created successfully!");
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Error creating order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <div>
        <h3 className="font-semibold mb-3">Customer Information</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Customer Name *"
            value={customerInfo.name}
            onChange={(e) =>
              setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="tel"
            placeholder="Phone Number *"
            value={customerInfo.phone}
            onChange={(e) =>
              setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
            }
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={customerInfo.email}
            onChange={(e) =>
              setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Order Type */}
      <div>
        <h3 className="font-semibold mb-3">Order Type</h3>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="pickup"
              checked={orderType === "pickup"}
              onChange={(e) => setOrderType(e.target.value as "pickup")}
              className="mr-2"
            />
            Pickup
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="delivery"
              checked={orderType === "delivery"}
              onChange={(e) => setOrderType(e.target.value as "delivery")}
              className="mr-2"
            />
            Delivery (+$3.99)
          </label>
        </div>
      </div>

      {/* Menu Items */}
      <div>
        <h3 className="font-semibold mb-3">Menu Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.id} className="border rounded p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <p className="text-lg font-bold text-green-600">
                    ${item.base_price}
                  </p>
                </div>
                <button
                  onClick={() => addItem(item)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Selected Items</h3>
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div
                key={item.menuItem.id}
                className="flex justify-between items-center bg-gray-50 p-2 rounded"
              >
                <span>{item.menuItem.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity - 1)
                    }
                    className="bg-gray-200 px-2 py-1 rounded"
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity + 1)
                    }
                    className="bg-gray-200 px-2 py-1 rounded"
                  >
                    +
                  </button>
                  <span className="ml-2">
                    ${(item.menuItem.base_price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(item.menuItem.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Total */}
      {selectedItems.length > 0 && (
        <div className="border-t pt-4">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (8%):</span>
              <span>${totals.tax.toFixed(2)}</span>
            </div>
            {orderType === "delivery" && (
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>${totals.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedItems.length === 0}
            className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
          >
            {isSubmitting ? "Creating Order..." : "Create Order"}
          </button>
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({ order }: { order: OrderWithItems }) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const updateOrderStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      // Reload page to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Error updating order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold">Order #{order.order_number}</h4>
        <span
          className={`px-2 py-1 rounded text-sm ${
            order.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : order.status === "confirmed"
              ? "bg-blue-100 text-blue-800"
              : order.status === "preparing"
              ? "bg-orange-100 text-orange-800"
              : order.status === "ready"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {order.status}
        </span>
      </div>

      <p className="text-sm text-gray-600">
        {order.customer_name} • {order.customer_phone}
      </p>
      <p className="text-sm text-gray-600">
        {order.order_type} • ${order.total}
      </p>

      {order.status === "pending" && (
        <button
          onClick={() => updateOrderStatus("confirmed")}
          disabled={updatingStatus}
          className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
        >
          {updatingStatus ? "Updating..." : "Confirm Order"}
        </button>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { MenuItemWithCategory, Restaurant, OrderWithItems } from "@/lib/types";

export default function StaffOrdersPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        // Get restaurant using API route instead of direct Supabase call
        const restaurantResponse = await fetch("/api/restaurants");
        if (!restaurantResponse.ok) {
          throw new Error(`Restaurant API error: ${restaurantResponse.status}`);
        }
        const restaurantData = await restaurantResponse.json();
        setRestaurant(restaurantData.data);

        // Get menu items
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
          `/api/orders?restaurant_id=${restaurantData.data.id}`
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
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-lg font-semibold">Loading restaurant data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-lg font-semibold mb-4">
          Error Loading Data
        </div>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Staff Order Management
        </h1>
        <div className="mt-2 text-lg text-gray-600">
          <span className="font-semibold">{restaurant?.name}</span> •
          <span className="ml-2">
            Today&apos;s Orders:{" "}
            <span className="font-semibold text-blue-600">{orders.length}</span>
          </span>{" "}
          •
          <span className="ml-2">
            Available Items:{" "}
            <span className="font-semibold text-green-600">
              {menuItems.length}
            </span>
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Order Creation - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">
              Create New Order
            </h2>
            <OrderCreationForm
              menuItems={menuItems}
              restaurantId={restaurant?.id || ""}
              onOrderCreated={() => {
                window.location.reload();
              }}
            />
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">
              Recent Orders
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-lg">
                    No orders yet today
                  </div>
                  <p className="text-gray-500 text-sm mt-2">
                    Create your first order!
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
    </div>
  );
}

// Order Creation Form Component with Better Styling
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
      justAdded?: boolean; // For UI feedback
    }>
  >([]);

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  const addItem = (menuItem: MenuItemWithCategory) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1, justAdded: true }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1, justAdded: true }];
    });

    // Show visual feedback
    setRecentlyAdded(menuItem.id);
    setTimeout(() => {
      setRecentlyAdded(null);
      // Remove the justAdded flag after animation
      setSelectedItems((prev) =>
        prev.map((item) => ({ ...item, justAdded: false }))
      );
    }, 1000);
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
        item.menuItem.id === menuItemId
          ? { ...item, quantity, justAdded: false }
          : item
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

      console.log("Submitting order:", { orderData, orderItems });

      // Submit order
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderData, orderItems }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Order creation failed:", responseData);
        throw new Error(responseData.error || "Failed to create order");
      }

      // Reset form
      setSelectedItems([]);
      setCustomerInfo({ name: "", phone: "", email: "" });
      setOrderType("pickup");

      // Notify parent
      onOrderCreated();

      alert("Order created successfully!");
    } catch (error) {
      console.error("Error creating order:", error);
      alert(
        `Error creating order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotal();
  const canSubmit =
    selectedItems.length > 0 && customerInfo.name && customerInfo.phone;

  return (
    <div className="space-y-8">
      {/* Customer Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              placeholder="Enter customer name"
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              value={customerInfo.phone}
              onChange={(e) =>
                setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              placeholder="customer@email.com"
              value={customerInfo.email}
              onChange={(e) =>
                setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Order Type */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Type</h3>
        <div className="flex gap-6">
          <label className="flex items-center text-lg">
            <input
              type="radio"
              value="pickup"
              checked={orderType === "pickup"}
              onChange={(e) => setOrderType(e.target.value as "pickup")}
              className="mr-3 w-5 h-5 text-blue-600"
            />
            <span className="font-medium">Pickup</span>
          </label>
          <label className="flex items-center text-lg">
            <input
              type="radio"
              value="delivery"
              checked={orderType === "delivery"}
              onChange={(e) => setOrderType(e.target.value as "delivery")}
              className="mr-3 w-5 h-5 text-blue-600"
            />
            <span className="font-medium">
              Delivery <span className="text-gray-600">(+$3.99)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Menu Items with Enhanced UI */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Available Menu Items
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto bg-gray-50 p-4 rounded-lg">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-lg p-4 transition-all duration-300 ${
                recentlyAdded === item.id
                  ? "border-green-500 shadow-lg transform scale-105"
                  : "border-gray-200 hover:shadow-md"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.description}
                  </p>
                  <p className="text-xl font-bold text-green-600 mt-2">
                    ${item.base_price}
                  </p>
                </div>
                <button
                  onClick={() => addItem(item)}
                  className={`ml-4 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    recentlyAdded === item.id
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {recentlyAdded === item.id ? "Added!" : "Add to Order"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Items with Animation */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Order Items ({selectedItems.length})
          </h3>
          <div className="space-y-3">
            {selectedItems.map((item) => (
              <div
                key={item.menuItem.id}
                className={`flex justify-between items-center bg-white p-3 rounded-lg border transition-all duration-300 ${
                  item.justAdded
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex-1">
                  <span className="font-medium text-gray-900">
                    {item.menuItem.name}
                  </span>
                  <div className="text-sm text-gray-600">
                    ${item.menuItem.base_price} each
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity - 1)
                    }
                    className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-lg font-bold"
                  >
                    -
                  </button>
                  <span className="font-semibold text-lg w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity + 1)
                    }
                    className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-lg font-bold"
                  >
                    +
                  </button>
                  <span className="font-bold text-lg text-green-600 ml-3 w-20 text-right">
                    ${(item.menuItem.base_price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(item.menuItem.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-3 font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Total and Submit */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
        <div className="space-y-3">
          <div className="flex justify-between text-lg">
            <span>Subtotal:</span>
            <span className="font-semibold">${totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span>Tax (8%):</span>
            <span className="font-semibold">${totals.tax.toFixed(2)}</span>
          </div>
          {orderType === "delivery" && (
            <div className="flex justify-between text-lg">
              <span>Delivery Fee:</span>
              <span className="font-semibold">
                ${totals.deliveryFee.toFixed(2)}
              </span>
            </div>
          )}
          <div className="border-t border-gray-400 pt-3">
            <div className="flex justify-between text-xl font-bold">
              <span>Total:</span>
              <span className="text-green-600">${totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !canSubmit}
          className={`w-full mt-6 py-4 rounded-lg text-lg font-bold transition-all duration-200 ${
            canSubmit && !isSubmitting
              ? "bg-green-600 hover:bg-green-700 text-white transform hover:scale-105"
              : "bg-gray-400 text-gray-600 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Order...
            </span>
          ) : canSubmit ? (
            "Create Order"
          ) : selectedItems.length === 0 ? (
            "Add items to create order"
          ) : (
            "Fill in customer information"
          )}
        </button>
      </div>
    </div>
  );
}

// Order Card Component with Better Styling
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

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    preparing: "bg-orange-100 text-orange-800 border-orange-200",
    ready: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-gray-100 text-gray-800 border-gray-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-lg">#{order.order_number}</h4>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold border ${
            statusColors[order.status as keyof typeof statusColors]
          }`}
        >
          {order.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <p>
          <span className="font-medium">Customer:</span> {order.customer_name}
        </p>
        <p>
          <span className="font-medium">Phone:</span> {order.customer_phone}
        </p>
        <p>
          <span className="font-medium">Type:</span> {order.order_type}
        </p>
        <p>
          <span className="font-medium">Total:</span>{" "}
          <span className="text-green-600 font-bold">${order.total}</span>
        </p>
      </div>

      {order.status === "pending" && (
        <button
          onClick={() => updateOrderStatus("confirmed")}
          disabled={updatingStatus}
          className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {updatingStatus ? "Updating..." : "Confirm Order"}
        </button>
      )}
    </div>
  );
}

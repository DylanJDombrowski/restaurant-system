// src/app/staff/orders/page.tsx - UPDATED with selectedAddress state
"use client";
import CustomerDetails from "@/components/features/orders/CustomerDetails";
import MenuNavigator from "@/components/features/orders/MenuNavigator";
import OrderCart, {
  useCartStatistics,
} from "@/components/features/orders/OrderCart";
import OrderCompletionModal from "@/components/features/orders/OrderCompletionModal";
import OrderSuccessMessage from "@/components/features/orders/OrderSuccessMessage";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  ConfiguredCartItem,
  CustomerLoyaltyDetails,
  MenuItemWithVariants,
  OrderWithItems,
  Restaurant,
  LoyaltyRedemption,
  CustomerAddress,
} from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

type ActiveTab = "new-order" | "pickup";

export default function StaffOrdersPage() {
  // ==========================================
  // UI STATE - TAB SYSTEM
  // ==========================================
  const [activeTab, setActiveTab] = useState<ActiveTab>("new-order");

  // ==========================================
  // CORE DATA STATES - SIMPLIFIED
  // ==========================================
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithVariants[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [cartItems, setCartItems] = useState<ConfiguredCartItem[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pickup functionality states
  const [completingOrderIds, setCompletingOrderIds] = useState<Set<string>>(
    new Set()
  );

  // ✅ UNIFIED CUSTOMER STATE + ADDRESS
  const [customer, setCustomer] = useState<CustomerLoyaltyDetails | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<
    CustomerAddress | undefined
  >(undefined); // ✅ NEW

  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");

  // Order completion modal states
  const [showOrderCompletionModal, setShowOrderCompletionModal] =
    useState(false);
  const [pendingLoyaltyRedemption, setPendingLoyaltyRedemption] =
    useState<LoyaltyRedemption | null>(null);

  // Order completion states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string;
    total: number;
    orderType: "pickup" | "delivery";
    estimatedTime: number;
  } | null>(null);

  // Cart statistics
  const cartStats = useCartStatistics(cartItems);
  const orderSummary = {
    subtotal: cartStats.subtotal,
    tax: cartStats.tax,
    deliveryFee: orderType === "delivery" ? 3.99 : 0,
    loyaltyDiscount: pendingLoyaltyRedemption?.discount_amount || 0,
    total:
      cartStats.subtotal +
      cartStats.tax +
      (orderType === "delivery" ? 3.99 : 0) -
      (pendingLoyaltyRedemption?.discount_amount || 0),
  };

  // ==========================================
  // DATA LOADING - SIMPLIFIED
  // ==========================================

  const loadOrders = useCallback(async (restaurantId: string) => {
    try {
      const ordersResponse = await fetch(
        `/api/orders?restaurant_id=${restaurantId}&limit=20`
      );
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Load restaurant data
      const restaurantResponse = await fetch("/api/restaurants");
      if (!restaurantResponse.ok)
        throw new Error("Failed to load restaurant data");
      const restaurantData = await restaurantResponse.json();
      setRestaurant(restaurantData.data);

      // Load menu data
      const menuResponse = await fetch(
        `/api/menu/full?restaurant_id=${restaurantData.data.id}`
      );
      if (!menuResponse.ok) throw new Error("Failed to load menu data");
      const menuData = await menuResponse.json();
      setMenuItems(menuData.data.menu_items || []);

      // Load orders
      await loadOrders(restaurantData.data.id);
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [loadOrders]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ==========================================
  // ✅ UPDATED CUSTOMER HANDLERS
  // ==========================================

  const handleCustomerSelected = (
    customer: CustomerLoyaltyDetails | null,
    address?: CustomerAddress
  ) => {
    setCustomer(customer);
    if (address) {
      setSelectedAddress(address); // ✅ Set the address here
      console.log(
        "🏠 Selected customer with default address:",
        address.label,
        address.street
      );
    } else {
      setSelectedAddress(undefined);
    }
  };

  // ==========================================
  // PICKUP FUNCTIONALITY (unchanged)
  // ==========================================

  const handleOrderPickupComplete = async (orderId: string) => {
    if (!restaurant) return;
    if (completingOrderIds.has(orderId)) return;

    try {
      setCompletingOrderIds((prev) => new Set(prev).add(orderId));

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          completed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update order status");
      }

      setOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== orderId)
      );

      setTimeout(() => {
        loadOrders(restaurant.id);
      }, 1000);
    } catch (error) {
      console.error("Error completing order pickup:", error);
      alert(
        `Error updating order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setCompletingOrderIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // ==========================================
  // CART MANAGEMENT (unchanged)
  // ==========================================

  const handleAddToCart = (configuredItem: ConfiguredCartItem) => {
    console.log("🛒 Adding to cart:", configuredItem.displayName);

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.menuItemId === configuredItem.menuItemId &&
          item.variantId === configuredItem.variantId &&
          JSON.stringify(item.selectedToppings) ===
            JSON.stringify(configuredItem.selectedToppings) &&
          JSON.stringify(item.selectedModifiers) ===
            JSON.stringify(configuredItem.selectedModifiers) &&
          item.specialInstructions === configuredItem.specialInstructions
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      } else {
        return [...prev, configuredItem];
      }
    });
  };

  const handleUpdateCartItem = (
    itemId: string,
    updates: Partial<ConfiguredCartItem>
  ) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // ==========================================
  // LOYALTY REDEMPTION MANAGEMENT (unchanged)
  // ==========================================

  const handleLoyaltyRedemptionApply = (redemption: LoyaltyRedemption) => {
    console.log("🎁 Loyalty redemption applied:", redemption);
    setPendingLoyaltyRedemption(redemption);
  };

  const handleLoyaltyRedemptionRemove = () => {
    console.log("🎁 Loyalty redemption removed");
    setPendingLoyaltyRedemption(null);
  };

  // ==========================================
  // ORDER COMPLETION WORKFLOW (unchanged)
  // ==========================================

  const handleCompleteOrder = () => {
    if (cartItems.length === 0) {
      alert("Please add items to the order first.");
      return;
    }

    setShowOrderCompletionModal(true);
  };

  const handleOrderCompletionConfirm = async (orderData: {
    customerInfo: {
      name: string;
      phone: string;
      email?: string;
    };
    orderType: "pickup" | "delivery";
    deliveryAddress?: {
      address: string;
      city: string;
      zip: string;
      instructions?: string;
    };
    loyaltyRedemption?: LoyaltyRedemption;
  }) => {
    setIsSubmitting(true);
    setShowOrderCompletionModal(false);

    try {
      const finalLoyaltyDiscount =
        orderData.loyaltyRedemption?.discount_amount || 0;
      const finalTotal = Math.max(
        0,
        orderSummary.subtotal +
          orderSummary.tax +
          orderSummary.deliveryFee -
          finalLoyaltyDiscount
      );

      const orderPayload = {
        restaurant_id: restaurant!.id,
        customer_name: orderData.customerInfo.name,
        customer_phone: orderData.customerInfo.phone,
        customer_email: orderData.customerInfo.email || undefined,
        order_type: orderData.orderType,
        subtotal: orderSummary.subtotal,
        tax_amount: orderSummary.tax,
        delivery_fee: orderSummary.deliveryFee,
        total: finalTotal,
        status: "confirmed" as const,
        loyalty_redemption: orderData.loyaltyRedemption,
        ...(orderData.orderType === "delivery" &&
          orderData.deliveryAddress && {
            customer_address: orderData.deliveryAddress.address,
            customer_city: orderData.deliveryAddress.city,
            customer_zip: orderData.deliveryAddress.zip,
            delivery_instructions:
              orderData.deliveryAddress.instructions || undefined,
          }),
      };

      const orderItemsData = cartItems.map((item) => ({
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.totalPrice,
        selectedToppings: item.selectedToppings,
        selectedModifiers: item.selectedModifiers,
        specialInstructions: item.specialInstructions,
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderData: orderPayload,
          orderItems: orderItemsData,
        }),
      });

      const responseData = await response.json();
      if (!response.ok)
        throw new Error(responseData.error || "Failed to create order");

      setCompletedOrder({
        orderNumber: responseData.data.order_number,
        total: finalTotal,
        orderType: orderData.orderType,
        estimatedTime: orderData.orderType === "pickup" ? 25 : 45,
      });
      setShowOrderSuccess(true);

      if (restaurant) {
        loadOrders(restaurant.id);
      }
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

  const handleOrderCompletionCancel = () => {
    setShowOrderCompletionModal(false);
  };

  const handleOrderSuccessComplete = () => {
    setCartItems([]);
    setCustomer(null);
    setSelectedAddress(undefined); // ✅ Clear address on completion
    setOrderType("pickup");
    setPendingLoyaltyRedemption(null);
    setShowOrderSuccess(false);
    setCompletedOrder(null);
  };

  // ==========================================
  // RENDER LOGIC (mostly unchanged)
  // ==========================================

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-lg font-semibold mb-4">
          Error Loading System
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

  const readyOrders = orders.filter((order) => order.status === "ready");
  const categoryCount = new Set(
    menuItems.map((item) => item.category?.name).filter(Boolean)
  ).size;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* TAB-BASED HEADER */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 md:px-6 py-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Pizza Mia Orders
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>{restaurant?.name}</span>
                  <span>📂 {categoryCount} categories</span>
                  <span>🍽️ {menuItems.length} items</span>
                  {activeTab === "new-order" && (
                    <>
                      <span className="text-blue-600">
                        Cart: {cartStats.totalItems} items
                      </span>
                      <span className="text-green-600 font-medium">
                        ${orderSummary.total.toFixed(2)}
                      </span>
                      {pendingLoyaltyRedemption && (
                        <span className="text-purple-600 font-medium">
                          🎁 -
                          {pendingLoyaltyRedemption.discount_amount.toFixed(2)}{" "}
                          loyalty
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Complete Order Button */}
              {activeTab === "new-order" && cartItems.length > 0 && (
                <button
                  onClick={handleCompleteOrder}
                  disabled={isSubmitting}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {isSubmitting
                    ? "Processing..."
                    : `Complete Order - ${orderSummary.total.toFixed(2)}`}
                </button>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab("new-order")}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  activeTab === "new-order"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white"
                }`}
              >
                📝 New Order
                {cartItems.length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {cartStats.totalItems}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("pickup")}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  activeTab === "pickup"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white"
                }`}
              >
                🍕 Ready for Pickup
                {readyOrders.length > 0 && (
                  <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                    {readyOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="p-4 md:p-6">
          {activeTab === "new-order" ? (
            // NEW ORDER TAB - Clean Two-Column Layout
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {/* LEFT: Menu Navigation */}
              <div className="lg:col-span-2">
                <MenuNavigator
                  menuItems={menuItems}
                  onAddToCart={handleAddToCart}
                  restaurantId={restaurant?.id || ""}
                />
              </div>

              {/* RIGHT: Cart & Customer Info */}
              <div className="space-y-4">
                {/* ✅ UPDATED: Customer Details with address passing */}
                <CustomerDetails
                  onCustomerSelected={handleCustomerSelected}
                  restaurantId={restaurant?.id || ""}
                />

                {/* Order Type Selection */}
                {cartItems.length > 0 && (
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Order Type
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setOrderType("pickup")}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          orderType === "pickup"
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-gray-300 text-gray-900 hover:border-gray-400"
                        }`}
                      >
                        <div className="font-semibold">🏃 Pickup</div>
                        <div className="text-sm">~25 minutes</div>
                      </button>

                      <button
                        onClick={() => setOrderType("delivery")}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          orderType === "delivery"
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-gray-300 text-gray-900 hover:border-gray-400"
                        }`}
                      >
                        <div className="font-semibold">🚚 Delivery</div>
                        <div className="text-sm">+$3.99 • ~45 min</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Order Cart with loyalty props */}
                <OrderCart
                  items={cartItems}
                  customer={customer}
                  onUpdateItem={handleUpdateCartItem}
                  onRemoveItem={handleRemoveCartItem}
                  restaurantId={restaurant?.id || ""}
                  orderSummary={orderSummary}
                  onCompleteOrder={handleCompleteOrder}
                  loyaltyRedemption={pendingLoyaltyRedemption}
                  onLoyaltyRedemptionApply={handleLoyaltyRedemptionApply}
                  onLoyaltyRedemptionRemove={handleLoyaltyRedemptionRemove}
                />
              </div>
            </div>
          ) : (
            // PICKUP TAB
            <div className="max-w-6xl mx-auto">
              <PickupOrdersView
                orders={readyOrders}
                onOrderComplete={handleOrderPickupComplete}
                completingOrderIds={completingOrderIds}
              />
            </div>
          )}
        </div>
      </div>

      {/* ✅ UPDATED: Order Completion Modal with delivery address */}
      {showOrderCompletionModal && (
        <OrderCompletionModal
          isOpen={showOrderCompletionModal}
          cartItems={cartItems}
          orderSummary={orderSummary}
          customer={customer}
          pendingLoyaltyRedemption={pendingLoyaltyRedemption}
          defaultOrderType={orderType}
          deliveryAddress={selectedAddress} // ✅ Pass the selected address
          onConfirm={handleOrderCompletionConfirm}
          onCancel={handleOrderCompletionCancel}
          restaurantId={restaurant?.id || ""}
        />
      )}

      {/* Order Success Modal */}
      {showOrderSuccess && completedOrder && (
        <OrderSuccessMessage
          orderNumber={completedOrder.orderNumber}
          orderTotal={completedOrder.total}
          orderType={completedOrder.orderType}
          estimatedTime={completedOrder.estimatedTime}
          onComplete={handleOrderSuccessComplete}
        />
      )}
    </>
  );
}

// ==========================================
// PICKUP ORDERS VIEW (unchanged)
// ==========================================

interface PickupOrdersViewProps {
  orders: OrderWithItems[];
  onOrderComplete: (orderId: string) => void;
  completingOrderIds: Set<string>;
}

function PickupOrdersView({
  orders,
  onOrderComplete,
  completingOrderIds,
}: PickupOrdersViewProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          All Caught Up!
        </h3>
        <p className="text-gray-600 mb-6">
          No orders are currently ready for pickup.
        </p>
        <div className="text-sm text-gray-500">
          Orders will appear here when the kitchen marks them as ready.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Orders Ready for Pickup ({orders.length})
        </h2>
        <div className="text-sm text-gray-600">
          Click Mark as Picked Up when customer collects their order
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => {
          const isCompleting = completingOrderIds.has(order.id);
          const orderAge =
            new Date().getTime() - new Date(order.created_at).getTime();
          const minutesWaiting = Math.floor(orderAge / (1000 * 60));

          return (
            <div
              key={order.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                isCompleting
                  ? "border-green-300 bg-green-50"
                  : minutesWaiting > 15
                  ? "border-red-300 bg-red-50"
                  : minutesWaiting > 10
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-gray-200 hover:shadow-md"
              }`}
            >
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    #{order.order_number}
                  </div>
                  <div className="text-lg font-medium text-gray-800">
                    {order.customer_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-600">
                    ${order.total.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">
                    {order.order_type}
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-900">
                  📞 {order.customer_phone}
                </div>
                {order.customer_email && (
                  <div className="text-sm text-gray-900">
                    ✉️ {order.customer_email}
                  </div>
                )}
              </div>

              {/* Wait Time Status */}
              <div className="mb-4">
                <div
                  className={`text-sm font-medium ${
                    minutesWaiting > 15
                      ? "text-red-600"
                      : minutesWaiting > 10
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  ⏱️ Waiting: {minutesWaiting} minutes
                  {minutesWaiting > 15 && " • PRIORITY"}
                  {minutesWaiting > 10 &&
                    minutesWaiting <= 15 &&
                    " • Getting Long"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Ordered at {new Date(order.created_at).toLocaleTimeString()}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onOrderComplete(order.id)}
                disabled={isCompleting}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isCompleting
                    ? "bg-green-200 text-green-800 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {isCompleting ? "Completing..." : "✅ Mark as Picked Up"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

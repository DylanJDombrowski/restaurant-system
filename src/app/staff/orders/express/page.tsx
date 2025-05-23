// src/app/staff/orders/page-express.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import {
  MenuItemWithVariants,
  Restaurant,
  OrderWithItems,
  Customer,
  CustomerAddress,
  Topping,
  Modifier,
  ConfiguredCartItem,
} from "@/lib/types";
import EnhancedMenuItemSelector from "@/components/features/orders/EnhancedMenuItemSelector";
import EnhancedCartSystem, {
  useCartStatistics,
} from "@/components/features/orders/EnhancedCartSystem";

/**
 * EXPRESS STAFF ORDERS PAGE
 *
 * This is the modified version that implements the "Order First, Customer Second" philosophy.
 * The core change is that we START with the menu visible and allow staff to build orders
 * immediately, then collect customer information when ready to complete the order.
 *
 * Key Educational Concept:
 * We're not removing functionality - we're reordering the workflow to match natural
 * conversation patterns. Customers call wanting to place orders, not provide database entries.
 */

export default function ExpressStaffOrdersPage() {
  // ==========================================
  // CORE DATA STATES (unchanged from original)
  // ==========================================
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithVariants[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [cartItems, setCartItems] = useState<ConfiguredCartItem[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // EXPRESS WORKFLOW: KEY STATE CHANGES
  // ==========================================

  /**
   * CRITICAL CHANGE #1: Customer info is now optional during order building
   * Instead of requiring confirmation upfront, we collect it when needed
   */
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // Customer lookup states (same as before, but non-blocking)
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>(
    []
  );
  const [customerLookupStatus, setCustomerLookupStatus] = useState<
    "idle" | "searching" | "found" | "not-found"
  >("idle");

  // Order type and delivery states
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: "",
    city: "",
    zip: "",
    instructions: "",
  });

  /**
   * CRITICAL CHANGE #2: Order completion workflow
   * Instead of confirming customer info to enable menu, we now have a completion workflow
   */
  const [orderCompletionStep, setOrderCompletionStep] = useState<
    "building" | "customer_info" | "finalizing" | "completed"
  >("building");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cart statistics for pricing display
  const cartStats = useCartStatistics(cartItems);
  const orderSummary = {
    subtotal: cartStats.subtotal,
    tax: cartStats.tax,
    deliveryFee: orderType === "delivery" ? 3.99 : 0,
    total:
      cartStats.subtotal +
      cartStats.tax +
      (orderType === "delivery" ? 3.99 : 0),
  };

  // ==========================================
  // DATA LOADING (unchanged from original)
  // ==========================================
  useEffect(() => {
    async function loadEnhancedData() {
      try {
        setError(null);
        setLoading(true);

        const restaurantResponse = await fetch("/api/restaurants");
        if (!restaurantResponse.ok)
          throw new Error(`Restaurant API error: ${restaurantResponse.status}`);
        const restaurantData = await restaurantResponse.json();
        setRestaurant(restaurantData.data);

        const menuResponse = await fetch(
          `/api/menu/full?restaurant_id=${restaurantData.data.id}`
        );
        if (!menuResponse.ok)
          throw new Error(`Menu API error: ${menuResponse.status}`);
        const menuData = await menuResponse.json();
        setMenuItems(menuData.data.menu_items || []);
        setToppings(menuData.data.toppings || []);
        setModifiers(menuData.data.modifiers || []);

        const ordersResponse = await fetch(
          `/api/orders?restaurant_id=${restaurantData.data.id}&limit=20`
        );
        if (!ordersResponse.ok)
          throw new Error(`Orders API error: ${ordersResponse.status}`);
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);
      } catch (error) {
        console.error("Error loading enhanced data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load data"
        );
      } finally {
        setLoading(false);
      }
    }
    loadEnhancedData();
  }, []);

  // ==========================================
  // CUSTOMER LOOKUP (modified for non-blocking workflow)
  // ==========================================

  const lookupCustomer = useCallback(
    async (phone: string) => {
      // Only lookup if we have enough digits and a restaurant
      if (phone.length < 10 || !restaurant) {
        setFoundCustomer(null);
        setCustomerAddresses([]);
        setCustomerLookupStatus("idle");
        return;
      }

      setLookupLoading(true);
      setCustomerLookupStatus("searching");

      try {
        const response = await fetch(
          `/api/customers/lookup?phone=${encodeURIComponent(
            phone
          )}&restaurant_id=${restaurant.id}`
        );
        const data = await response.json();

        if (data.data && data.data.customer) {
          const customer = data.data.customer;
          setFoundCustomer(customer);
          setCustomerLookupStatus("found");

          // Auto-fill customer info when found
          setCustomerInfo((prev) => ({
            name: customer.name || prev.name,
            phone: customer.phone,
            email: customer.email || prev.email,
          }));

          // Load customer addresses
          const addressResponse = await fetch(
            `/api/customers/${customer.id}/addresses`
          );
          const addressData = await addressResponse.json();
          const fetchedAddresses: CustomerAddress[] =
            addressData.data?.addresses || [];
          setCustomerAddresses(fetchedAddresses);

          // Smart order type suggestion
          if (fetchedAddresses.length > 0 && orderType === "pickup") {
            // Don't auto-change, but we could show a suggestion here
          }
        } else {
          setFoundCustomer(null);
          setCustomerAddresses([]);
          setCustomerLookupStatus("not-found");
        }
      } catch (error) {
        console.error("Error looking up customer:", error);
        setCustomerLookupStatus("idle");
        setFoundCustomer(null);
        setCustomerAddresses([]);
      } finally {
        setLookupLoading(false);
      }
    },
    [restaurant, orderType]
  );

  // Debounced customer lookup
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerInfo.phone && restaurant) {
        lookupCustomer(customerInfo.phone);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [customerInfo.phone, lookupCustomer, restaurant]);

  // ==========================================
  // CART MANAGEMENT (unchanged from original)
  // ==========================================

  const handleAddToCart = (configuredItem: ConfiguredCartItem) => {
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
  // EXPRESS WORKFLOW: ORDER COMPLETION LOGIC
  // ==========================================

  /**
   * CRITICAL CHANGE #3: Multi-step order completion
   * This replaces the single "confirm customer" step with a guided completion process
   */

  const handleStartOrderCompletion = () => {
    if (cartItems.length === 0) {
      alert("Please add items to the order first.");
      return;
    }
    setOrderCompletionStep("customer_info");
  };

  const handleCustomerInfoComplete = () => {
    if (!customerInfo.name || !customerInfo.phone) {
      alert("Please enter customer name and phone number.");
      return;
    }

    if (
      orderType === "delivery" &&
      (!deliveryAddress.address ||
        !deliveryAddress.city ||
        !deliveryAddress.zip)
    ) {
      alert("Please fill in the delivery address.");
      return;
    }

    setOrderCompletionStep("finalizing");
    handleSubmitOrder();
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);

    try {
      const orderData = {
        restaurant_id: restaurant!.id,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || undefined,
        order_type: orderType,
        subtotal: orderSummary.subtotal,
        tax_amount: orderSummary.tax,
        delivery_fee: orderSummary.deliveryFee,
        total: orderSummary.total,
        status: "confirmed" as const,
        ...(orderType === "delivery" && {
          customer_address: deliveryAddress.address,
          customer_city: deliveryAddress.city,
          customer_zip: deliveryAddress.zip,
          delivery_instructions: deliveryAddress.instructions || undefined,
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
        body: JSON.stringify({ orderData, orderItems: orderItemsData }),
      });

      const responseData = await response.json();
      if (!response.ok)
        throw new Error(responseData.error || "Failed to create order");

      // SUCCESS: Reset everything for next order
      setCartItems([]);
      setCustomerInfo({ name: "", phone: "", email: "" });
      setOrderType("pickup");
      setDeliveryAddress({ address: "", city: "", zip: "", instructions: "" });
      setFoundCustomer(null);
      setCustomerAddresses([]);
      setSelectedAddressId(null);
      setCustomerLookupStatus("idle");
      setOrderCompletionStep("completed");

      alert(
        "Order created successfully! Order Number: " +
          responseData.data.order_number
      );

      // Reset to building state for next order
      setTimeout(() => {
        setOrderCompletionStep("building");
      }, 2000);

      // Refresh orders list
      const ordersResponse = await fetch(
        `/api/orders?restaurant_id=${restaurant!.id}&limit=20`
      );
      if (ordersResponse.ok) {
        const updatedOrdersData = await ordersResponse.json();
        setOrders(updatedOrdersData.data || []);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert(
        `Error creating order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setOrderCompletionStep("customer_info");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrderCompletion = () => {
    setOrderCompletionStep("building");
  };

  // ==========================================
  // RENDER: EXPRESS WORKFLOW INTERFACE
  // ==========================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-lg font-semibold text-gray-900">
          Loading enhanced ordering system...
        </div>
      </div>
    );
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

  /**
   * CRITICAL CHANGE #4: Conditional rendering based on order completion step
   * The main interface now shows different views based on where we are in the process
   */

  // CUSTOMER INFO COLLECTION MODAL
  if (orderCompletionStep === "customer_info") {
    return (
      <CustomerInfoModal
        customerInfo={customerInfo}
        setCustomerInfo={setCustomerInfo}
        foundCustomer={foundCustomer}
        lookupLoading={lookupLoading}
        customerLookupStatus={customerLookupStatus}
        customerAddresses={customerAddresses}
        orderType={orderType}
        setOrderType={setOrderType}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        selectedAddressId={selectedAddressId}
        setSelectedAddressId={setSelectedAddressId}
        cartStats={cartStats}
        orderSummary={orderSummary}
        onComplete={handleCustomerInfoComplete}
        onCancel={handleCancelOrderCompletion}
        isSubmitting={isSubmitting}
      />
    );
  }

  // ORDER SUCCESS STATE
  if (orderCompletionStep === "completed") {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <div className="text-2xl font-bold text-green-600 mb-2">
            Order Created Successfully!
          </div>
          <div className="text-gray-600">Starting new order...</div>
        </div>
      </div>
    );
  }

  // MAIN EXPRESS INTERFACE
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* EXPRESS HEADER with Order Status */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Express Order Taking
            </h1>
            <div className="mt-2 text-lg text-gray-600">
              <span className="font-semibold">{restaurant?.name}</span> •
              <span className="ml-2">
                Cart:{" "}
                <span className="font-semibold text-blue-600">
                  {cartStats.totalItems} items
                </span>
              </span>{" "}
              •
              <span className="ml-2">
                Total:{" "}
                <span className="font-semibold text-green-600">
                  ${orderSummary.total.toFixed(2)}
                </span>
              </span>
            </div>
          </div>

          {/* Customer Status Badge - Non-blocking */}
          <div className="flex items-center gap-4">
            <CustomerStatusBadge
              customerInfo={customerInfo}
              foundCustomer={foundCustomer}
              customerLookupStatus={customerLookupStatus}
            />

            {cartItems.length > 0 && (
              <button
                onClick={handleStartOrderCompletion}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Complete Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN EXPRESS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: MENU (always visible - this is the key change) */}
        <div className="lg:col-span-2">
          <EnhancedMenuItemSelector
            menuItems={menuItems}
            toppings={toppings}
            modifiers={modifiers}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* RIGHT: CART + READY ORDERS */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Order Cart */}
          <EnhancedCartSystem
            items={cartItems}
            onUpdateItem={handleUpdateCartItem}
            onRemoveItem={handleRemoveCartItem}
            restaurantId={restaurant?.id || ""}
            orderSummary={orderSummary}
          />

          {/* READY FOR PICKUP - This is the dual-role integration */}
          <ReadyForPickupPanel
            orders={orders}
            onOrderComplete={(orderId) => {
              // Handle marking order as complete/picked up
              console.log("Mark order complete:", orderId);
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * CUSTOMER STATUS BADGE COMPONENT
 * Shows customer info status without blocking workflow
 */
interface CustomerStatusBadgeProps {
  customerInfo: { name: string; phone: string; email: string };
  foundCustomer: Customer | null;
  customerLookupStatus: "idle" | "searching" | "found" | "not-found";
}

function CustomerStatusBadge({
  customerInfo,
  foundCustomer,
  customerLookupStatus,
}: CustomerStatusBadgeProps) {
  if (foundCustomer) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <div className="text-sm font-medium text-green-800">
          Customer: {foundCustomer.name}
        </div>
        <div className="text-xs text-green-600">
          {foundCustomer.total_orders} orders • {foundCustomer.loyalty_points}{" "}
          points
        </div>
      </div>
    );
  }

  if (customerInfo.phone && customerLookupStatus === "not-found") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
        <div className="text-sm font-medium text-blue-800">New Customer</div>
        <div className="text-xs text-blue-600">{customerInfo.phone}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
      <div className="text-sm font-medium text-gray-600">No Customer Info</div>
      <div className="text-xs text-gray-500">
        Will collect when completing order
      </div>
    </div>
  );
}

/**
 * READY FOR PICKUP PANEL
 * Shows orders ready for customer pickup - supports dual role staff
 */
interface ReadyForPickupPanelProps {
  orders: OrderWithItems[];
  onOrderComplete: (orderId: string) => void;
}

function ReadyForPickupPanel({
  orders,
  onOrderComplete,
}: ReadyForPickupPanelProps) {
  const readyOrders = orders.filter((order) => order.status === "ready");

  return (
    <div className="bg-white border border-gray-300 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 bg-orange-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🍕</span>
          Ready for Pickup ({readyOrders.length})
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {readyOrders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <div>No orders ready for pickup</div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      #{order.order_number}
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.customer_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.customer_phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${order.total.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.order_type}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onOrderComplete(order.id)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Mark as Picked Up
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CUSTOMER INFO MODAL COMPONENT
 * Full-screen customer info collection when completing order
 */
interface CustomerInfoModalProps {
  customerInfo: { name: string; phone: string; email: string };
  setCustomerInfo: React.Dispatch<
    React.SetStateAction<{ name: string; phone: string; email: string }>
  >;
  foundCustomer: Customer | null;
  lookupLoading: boolean;
  customerLookupStatus: "idle" | "searching" | "found" | "not-found";
  customerAddresses: CustomerAddress[];
  orderType: "pickup" | "delivery";
  setOrderType: (type: "pickup" | "delivery") => void;
  deliveryAddress: {
    address: string;
    city: string;
    zip: string;
    instructions: string;
  };
  setDeliveryAddress: React.Dispatch<
    React.SetStateAction<{
      address: string;
      city: string;
      zip: string;
      instructions: string;
    }>
  >;
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
  cartStats: { totalItems: number; subtotal: number; tax: number };
  orderSummary: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
  };
  onComplete: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function CustomerInfoModal({
  customerInfo,
  setCustomerInfo,
  foundCustomer,
  lookupLoading,
  customerLookupStatus,
  customerAddresses,
  orderType,
  setOrderType,
  deliveryAddress,
  setDeliveryAddress,
  selectedAddressId,
  setSelectedAddressId,
  cartStats,
  orderSummary,
  onComplete,
  onCancel,
  isSubmitting,
}: CustomerInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Complete Order
            </h2>
            <div className="text-right">
              <div className="text-sm text-gray-600">Order Total</div>
              <div className="text-2xl font-bold text-green-600">
                ${orderSummary.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Information
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {lookupLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>

                {customerLookupStatus === "found" && foundCustomer && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Found: {foundCustomer.name} ({foundCustomer.total_orders}{" "}
                    orders, {foundCustomer.loyalty_points} points)
                  </p>
                )}

                {customerLookupStatus === "not-found" &&
                  customerInfo.phone.length >= 10 && (
                    <p className="text-sm text-blue-600 mt-1">
                      New customer - please fill in details
                    </p>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Order Type</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setOrderType("pickup")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  orderType === "pickup"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                <div className="font-semibold text-gray-900">Pickup</div>
                <div className="text-sm text-gray-600">~25 minutes</div>
              </button>

              <button
                onClick={() => setOrderType("delivery")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  orderType === "delivery"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                <div className="font-semibold text-gray-900">Delivery</div>
                <div className="text-sm text-gray-600">
                  +$3.99 • ~45 minutes
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Address (if delivery selected) */}
          {orderType === "delivery" && (
            <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-gray-900">Delivery Address</h4>

              {/* Show saved addresses if available */}
              {customerAddresses.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Saved Addresses
                  </label>
                  {customerAddresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer ${
                        selectedAddressId === addr.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => {
                          setSelectedAddressId(addr.id);
                          setDeliveryAddress({
                            address: addr.address,
                            city: addr.city,
                            zip: addr.zip,
                            instructions: addr.delivery_instructions || "",
                          });
                        }}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {addr.address}, {addr.city} {addr.zip}
                        </div>
                        {addr.delivery_instructions && (
                          <div className="text-blue-700 text-xs">
                            {addr.delivery_instructions}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* New address option */}
              <label
                className={`flex items-center p-3 rounded-lg border cursor-pointer ${
                  selectedAddressId === null
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  value="new"
                  checked={selectedAddressId === null}
                  onChange={() => setSelectedAddressId(null)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-900">
                  Enter new address
                </span>
              </label>

              {/* Address input fields */}
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Street Address"
                  value={deliveryAddress.address}
                  onChange={(e) =>
                    setDeliveryAddress((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={deliveryAddress.city}
                    onChange={(e) =>
                      setDeliveryAddress((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={deliveryAddress.zip}
                    onChange={(e) =>
                      setDeliveryAddress((prev) => ({
                        ...prev,
                        zip: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <textarea
                  placeholder="Delivery instructions..."
                  value={deliveryAddress.instructions}
                  onChange={(e) =>
                    setDeliveryAddress((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Items ({cartStats.totalItems}):</span>
                <span>${orderSummary.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${orderSummary.tax.toFixed(2)}</span>
              </div>
              {orderSummary.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>${orderSummary.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 font-semibold flex justify-between">
                <span>Total:</span>
                <span>${orderSummary.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Back to Order
          </button>

          <button
            onClick={onComplete}
            disabled={isSubmitting || !customerInfo.name || !customerInfo.phone}
            className="px-8 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Processing..." : "Complete Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

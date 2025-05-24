// src/app/staff/orders/page.tsx - UPDATED to use SmartMenuItemSelector
"use client";
import { useCallback, useEffect, useState } from "react";
import { MenuItemWithVariants, Restaurant, OrderWithItems, Customer, Topping, Modifier, ConfiguredCartItem } from "@/lib/types";
// 🔄 CHANGE: Switch to SmartMenuItemSelector
import SmartMenuItemSelector from "@/components/features/orders/SmartMenuItemSelector";
import EnhancedCartSystem, { useCartStatistics } from "@/components/features/orders/EnhancedCartSystem";

/**
 * 🔧 UPDATED: Switch to SmartMenuItemSelector for sandwich support
 */

export default function ExpressStaffOrdersPage() {
  // ==========================================
  // CORE DATA STATES (unchanged)
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

  // Pickup functionality states
  const [completingOrderIds, setCompletingOrderIds] = useState<Set<string>>(new Set());

  // Customer workflow states
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customerLookupStatus, setCustomerLookupStatus] = useState<"idle" | "searching" | "found" | "not-found">("idle");

  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");

  const [deliveryAddress, setDeliveryAddress] = useState({
    address: "",
    city: "",
    zip: "",
    instructions: "",
  });

  const [orderCompletionStep, setOrderCompletionStep] = useState<"building" | "customer_info" | "finalizing" | "completed">("building");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cart statistics
  const cartStats = useCartStatistics(cartItems);
  const orderSummary = {
    subtotal: cartStats.subtotal,
    tax: cartStats.tax,
    deliveryFee: orderType === "delivery" ? 3.99 : 0,
    total: cartStats.subtotal + cartStats.tax + (orderType === "delivery" ? 3.99 : 0),
  };

  // ==========================================
  // DATA LOADING (unchanged)
  // ==========================================

  const loadOrders = useCallback(async (restaurantId: string) => {
    try {
      const ordersResponse = await fetch(`/api/orders?restaurant_id=${restaurantId}&limit=20`);
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

      const restaurantResponse = await fetch("/api/restaurants");
      if (!restaurantResponse.ok) throw new Error("Failed to load restaurant data");
      const restaurantData = await restaurantResponse.json();
      setRestaurant(restaurantData.data);

      const menuResponse = await fetch(`/api/menu/full?restaurant_id=${restaurantData.data.id}`);
      if (!menuResponse.ok) throw new Error("Failed to load menu data");
      const menuData = await menuResponse.json();
      setMenuItems(menuData.data.menu_items || []);
      setToppings(menuData.data.toppings || []);
      setModifiers(menuData.data.modifiers || []);

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

      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));

      const order = orders.find((o) => o.id === orderId);
      if (order) {
        console.log(`Order #${order.order_number} marked as picked up`);
      }

      setTimeout(() => {
        loadOrders(restaurant.id);
      }, 1000);
    } catch (error) {
      console.error("Error completing order pickup:", error);
      alert(`Error updating order: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setCompletingOrderIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // ==========================================
  // CUSTOMER LOOKUP (unchanged)
  // ==========================================

  const lookupCustomer = useCallback(
    async (phone: string) => {
      if (phone.length < 10 || !restaurant) {
        setFoundCustomer(null);
        setCustomerLookupStatus("idle");
        return;
      }

      setLookupLoading(true);
      setCustomerLookupStatus("searching");

      try {
        const response = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(phone)}&restaurant_id=${restaurant.id}`);
        const data = await response.json();

        if (data.data && data.data.customer) {
          const customer = data.data.customer;
          setFoundCustomer(customer);
          setCustomerLookupStatus("found");

          setCustomerInfo((prev) => ({
            name: customer.name || prev.name,
            phone: customer.phone,
            email: customer.email || prev.email,
          }));
        } else {
          setFoundCustomer(null);
          setCustomerLookupStatus("not-found");
        }
      } catch (error) {
        console.error("Error looking up customer:", error);
        setCustomerLookupStatus("idle");
        setFoundCustomer(null);
      } finally {
        setLookupLoading(false);
      }
    },
    [restaurant]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerInfo.phone && restaurant) {
        lookupCustomer(customerInfo.phone);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [customerInfo.phone, lookupCustomer, restaurant]);

  // ==========================================
  // CART MANAGEMENT (unchanged)
  // ==========================================

  const handleAddToCart = (configuredItem: ConfiguredCartItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.menuItemId === configuredItem.menuItemId &&
          item.variantId === configuredItem.variantId &&
          JSON.stringify(item.selectedToppings) === JSON.stringify(configuredItem.selectedToppings) &&
          JSON.stringify(item.selectedModifiers) === JSON.stringify(configuredItem.selectedModifiers) &&
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

  const handleUpdateCartItem = (itemId: string, updates: Partial<ConfiguredCartItem>) => {
    setCartItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // ==========================================
  // ORDER COMPLETION WORKFLOW (unchanged)
  // ==========================================

  const handleCompleteOrder = () => {
    if (cartItems.length === 0) {
      alert("Please add items to the order first.");
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      alert("Please add customer information first.");
      return;
    }

    if (orderType === "delivery" && (!deliveryAddress.address || !deliveryAddress.city || !deliveryAddress.zip)) {
      alert("Please fill in the delivery address.");
      return;
    }

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
      if (!response.ok) throw new Error(responseData.error || "Failed to create order");

      // Reset everything for next order
      setCartItems([]);
      setCustomerInfo({ name: "", phone: "", email: "" });
      setOrderType("pickup");
      setDeliveryAddress({ address: "", city: "", zip: "", instructions: "" });
      setFoundCustomer(null);
      setCustomerLookupStatus("idle");
      setOrderCompletionStep("completed");

      alert("Order created successfully! Order Number: " + responseData.data.order_number);

      setTimeout(() => {
        setOrderCompletionStep("building");
      }, 2000);

      if (restaurant) {
        loadOrders(restaurant.id);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert(`Error creating order: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // RENDER LOGIC (unchanged except selector)
  // ==========================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-lg font-semibold text-gray-900">Loading enhanced ordering system...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-lg font-semibold mb-4">Error Loading System</div>
        <p className="text-gray-900">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  if (orderCompletionStep === "completed") {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <div className="text-2xl font-bold text-green-600 mb-2">Order Created Successfully!</div>
          <div className="text-gray-600">Starting new order...</div>
        </div>
      </div>
    );
  }

  const readyOrders = orders.filter((order) => order.status === "ready");

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ENHANCED HEADER */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Express Order Taking</h1>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                <span className="font-semibold">{restaurant?.name}</span>
              </span>
              <span className="text-blue-600">
                Cart: <span className="font-semibold">{cartStats.totalItems} items</span>
              </span>
              <span className="text-green-600">
                Total: <span className="font-semibold">${orderSummary.total.toFixed(2)}</span>
              </span>
              {readyOrders.length > 0 && (
                <span className="text-orange-600">
                  <span className="font-semibold">{readyOrders.length}</span> ready for pickup
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CustomerStatusBadge customerInfo={customerInfo} foundCustomer={foundCustomer} customerLookupStatus={customerLookupStatus} />

            {cartItems.length > 0 && (
              <button
                onClick={handleCompleteOrder}
                disabled={isSubmitting}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {isSubmitting ? "Processing..." : "Complete Order"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* LEFT: MENU - 🔄 CHANGE: Use SmartMenuItemSelector */}
        <div className="xl:col-span-2">
          <SmartMenuItemSelector menuItems={menuItems} toppings={toppings} modifiers={modifiers} onAddToCart={handleAddToCart} />
        </div>

        {/* CENTER: CART */}
        <div className="xl:col-span-1">
          <EnhancedCartSystem
            items={cartItems}
            onUpdateItem={handleUpdateCartItem}
            onRemoveItem={handleRemoveCartItem}
            restaurantId={restaurant?.id || ""}
            orderSummary={orderSummary}
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
            foundCustomer={foundCustomer}
            onCustomerLookup={lookupCustomer}
            lookupLoading={lookupLoading}
            customerLookupStatus={customerLookupStatus}
            orderType={orderType}
            setOrderType={setOrderType}
            onCompleteOrder={handleCompleteOrder}
          />
        </div>

        {/* RIGHT: PICKUP ORDERS */}
        <div className="xl:col-span-1">
          <ReadyForPickupPanel orders={readyOrders} onOrderComplete={handleOrderPickupComplete} completingOrderIds={completingOrderIds} />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// HELPER COMPONENTS (unchanged)
// ==========================================

interface ReadyForPickupPanelProps {
  orders: OrderWithItems[];
  onOrderComplete: (orderId: string) => void;
  completingOrderIds: Set<string>;
}

function ReadyForPickupPanel({ orders, onOrderComplete, completingOrderIds }: ReadyForPickupPanelProps) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg h-fit">
      <div className="px-4 py-3 border-b border-gray-200 bg-orange-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🍕</span>
          Ready for Pickup
          {orders.length > 0 && <span className="ml-2 bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-sm">{orders.length}</span>}
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <div className="font-medium text-gray-900 mb-1">All caught up!</div>
            <div className="text-sm">No orders ready for pickup</div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {orders.map((order) => {
              const isCompleting = completingOrderIds.has(order.id);
              const orderAge = new Date().getTime() - new Date(order.created_at).getTime();
              const minutesWaiting = Math.floor(orderAge / (1000 * 60));

              return (
                <div
                  key={order.id}
                  className={`border rounded-lg p-3 transition-all ${
                    isCompleting
                      ? "border-green-300 bg-green-50"
                      : minutesWaiting > 10
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">#{order.order_number}</div>
                      <div className="text-sm text-gray-900 font-medium">{order.customer_name}</div>
                      <div className="text-sm text-gray-600">{order.customer_phone}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Waiting {minutesWaiting} min
                        {minutesWaiting > 10 && <span className="text-red-600 font-medium"> • Long wait!</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${order.total.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 capitalize">{order.order_type}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onOrderComplete(order.id)}
                    disabled={isCompleting}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      isCompleting ? "bg-green-200 text-green-800 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {isCompleting ? "Completing..." : "Mark as Picked Up"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface CustomerStatusBadgeProps {
  customerInfo: { name: string; phone: string; email: string };
  foundCustomer: Customer | null;
  customerLookupStatus: "idle" | "searching" | "found" | "not-found";
}

function CustomerStatusBadge({ customerInfo, foundCustomer, customerLookupStatus }: CustomerStatusBadgeProps) {
  if (foundCustomer) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <div className="text-sm font-medium text-green-800">Customer: {foundCustomer.name}</div>
        <div className="text-xs text-green-600">
          {foundCustomer.total_orders} orders • {foundCustomer.loyalty_points} points
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
      <div className="text-xs text-gray-500">Add customer info in cart section</div>
    </div>
  );
}

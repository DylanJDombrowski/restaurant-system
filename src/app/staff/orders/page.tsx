// src/app/staff/orders/page-enhanced.tsx
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
} from "@/lib/types";
import EnhancedMenuItemSelector from "@/components/features/orders/EnhancedMenuItemSelector";
import { ConfiguredCartItem } from "@/lib/types";
import EnhancedCartSystem, {
  useCartStatistics,
} from "@/components/features/orders/EnhancedCartSystem";

/**
 * Enhanced Staff Orders Page
 *
 * This page represents the evolution of your order management system. It integrates
 * all the sophisticated customization capabilities we've built while maintaining
 * the efficiency your staff needs during busy service periods.
 *
 * Key improvements from the original:
 * 1. Supports complex menu items with variants (sizes, crusts)
 * 2. Handles sophisticated topping and modifier systems
 * 3. Implements your custom pricing logic (no credits for removed toppings)
 * 4. Provides progressive disclosure (simple items stay simple)
 * 5. Real-time price calculation throughout the process
 *
 * Think of this as transforming from a basic calculator to a sophisticated
 * order management system that understands the nuances of your business.
 */

// First, let's create better form styling constants
const inputStyles = `
  w-full border border-gray-300 rounded-lg px-3 py-2
  text-gray-900 placeholder-gray-600 
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
  disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
`;

const labelStyles = `
  block text-sm font-medium text-gray-900 mb-1
`;

export default function EnhancedStaffOrdersPage() {
  // Core data states
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithVariants[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);

  // Cart state - this is the heart of our enhanced system
  const [cartItems, setCartItems] = useState<ConfiguredCartItem[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecentOrdersVisible, setIsRecentOrdersVisible] = useState(false);

  // Customer management states (keeping your existing logic)
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });
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
  const [orderTypeAutoSuggested, setOrderTypeAutoSuggested] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: "",
    city: "",
    zip: "",
    instructions: "",
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer info management
  const [isCustomerInfoExpanded, setIsCustomerInfoExpanded] = useState(true);
  const [customerInfoConfirmed, setCustomerInfoConfirmed] = useState(false);

  // Calculate cart statistics using our enhanced hook
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

  /**
   * Data Loading Phase
   *
   * This loads all the data needed for the enhanced ordering system.
   * Notice how we're now loading the full menu with variants, toppings, and modifiers.
   */
  useEffect(() => {
    async function loadEnhancedData() {
      try {
        setError(null);

        // Load restaurant information
        const restaurantResponse = await fetch("/api/restaurants");
        if (!restaurantResponse.ok) {
          throw new Error(`Restaurant API error: ${restaurantResponse.status}`);
        }
        const restaurantData = await restaurantResponse.json();
        setRestaurant(restaurantData.data);

        // Load complete menu with variants and customization options
        const menuResponse = await fetch(
          `/api/menu/full?restaurant_id=${restaurantData.data.id}`
        );
        if (!menuResponse.ok) {
          throw new Error(`Menu API error: ${menuResponse.status}`);
        }
        const menuData = await menuResponse.json();

        // Extract data from the enhanced menu response
        setMenuItems(menuData.data.menu_items || []);
        setToppings(menuData.data.toppings || []);
        setModifiers(menuData.data.modifiers || []);

        // Load recent orders for reference
        const ordersResponse = await fetch(
          `/api/orders?restaurant_id=${restaurantData.data.id}&limit=20`
        );
        if (!ordersResponse.ok) {
          throw new Error(`Orders API error: ${ordersResponse.status}`);
        }
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

  /**
   * Customer Lookup Logic
   *
   * Keeping your existing customer lookup functionality since it works well.
   */
  const lookupCustomer = useCallback(
    async (phone: string) => {
      if (phone.length < 10) {
        setFoundCustomer(null);
        setCustomerAddresses([]);
        setCustomerLookupStatus("idle");
        setOrderTypeAutoSuggested(false);
        return;
      }
      setLookupLoading(true);
      setCustomerLookupStatus("searching");
      try {
        const response = await fetch(
          `/api/customers/lookup?phone=${encodeURIComponent(
            phone
          )}&restaurant_id=${restaurant!.id}`
        );
        const data = await response.json();
        if (data.data && data.data.customer) {
          const customer = data.data.customer;
          setFoundCustomer(customer);
          setCustomerLookupStatus("found");
          setCustomerInfo({
            name: customer.name || "",
            phone: customer.phone,
            email: customer.email || "",
          });
          const addressResponse = await fetch(
            `/api/customers/${customer.id}/addresses`
          );
          const addressData = await addressResponse.json();
          const addresses = addressData.data?.addresses || [];
          setCustomerAddresses(addresses);
          if (
            addresses.length > 0 &&
            orderType === "pickup" &&
            !orderTypeAutoSuggested
          ) {
            setOrderTypeAutoSuggested(true);
          }
        } else {
          setFoundCustomer(null);
          setCustomerAddresses([]);
          setCustomerLookupStatus("not-found");
          setOrderTypeAutoSuggested(false);
        }
      } catch (error) {
        console.error("Error looking up customer:", error);
        setCustomerLookupStatus("idle");
      } finally {
        setLookupLoading(false);
      }
    },
    [restaurant, orderType, orderTypeAutoSuggested]
  );

  const handleAddressSelection = useCallback(
    (addressId: string) => {
      const address = customerAddresses.find((addr) => addr.id === addressId);
      if (address) {
        setSelectedAddressId(addressId);
        setDeliveryAddress({
          address: address.address,
          city: address.city,
          zip: address.zip,
          instructions: address.delivery_instructions || "",
        });
      }
    },
    [customerAddresses]
  );

  const handleOrderTypeChange = (newType: "pickup" | "delivery") => {
    setOrderType(newType);
    // Update cart delivery fee
    if (
      newType === "delivery" &&
      customerAddresses.length > 0 &&
      !selectedAddressId
    ) {
      const defaultAddress =
        customerAddresses.find((addr) => addr.is_default) ||
        customerAddresses[0];
      if (defaultAddress) {
        handleAddressSelection(defaultAddress.id);
      }
    }
    setOrderTypeAutoSuggested(false);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerInfo.phone && restaurant) {
        lookupCustomer(customerInfo.phone);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [customerInfo.phone, lookupCustomer, restaurant]);

  const handleConfirmCustomer = () => {
    if (customerInfo.name && customerInfo.phone) {
      setCustomerInfoConfirmed(true);
      setIsCustomerInfoExpanded(false);
    } else {
      alert("Please enter customer name and phone number.");
    }
  };

  /**
   * Enhanced Cart Management
   *
   * These functions handle the sophisticated cart operations for configured items.
   */
  const handleAddToCart = (configuredItem: ConfiguredCartItem) => {
    setCartItems((prev) => {
      // Check if the exact same configuration already exists
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
        // Same configuration exists, just increase quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      } else {
        // New configuration, add as new item
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

  /**
   * Order Submission
   *
   * This transforms our configured cart items into the format your backend expects.
   */
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0 || !customerInfo.name || !customerInfo.phone) {
      alert("Please add items and fill in customer information.");
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

    setIsSubmitting(true);
    try {
      // Prepare order data
      const orderData = {
        restaurant_id: restaurant!.id,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || null,
        order_type: orderType,
        subtotal: orderSummary.subtotal,
        tax_amount: orderSummary.tax,
        delivery_fee: orderSummary.deliveryFee,
        total: orderSummary.total,
        status: "pending" as const,
        ...(orderType === "delivery" && {
          customer_address: deliveryAddress.address,
          customer_city: deliveryAddress.city,
          customer_zip: deliveryAddress.zip,
          delivery_instructions: deliveryAddress.instructions || null,
        }),
      };

      // Transform cart items to API format
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
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create order");
      }

      // Reset form state
      setCartItems([]);
      setCustomerInfo({ name: "", phone: "", email: "" });
      setOrderType("pickup");
      setDeliveryAddress({ address: "", city: "", zip: "", instructions: "" });
      setFoundCustomer(null);
      setCustomerAddresses([]);
      setSelectedAddressId(null);
      setCustomerLookupStatus("idle");
      setOrderTypeAutoSuggested(false);
      setCustomerInfoConfirmed(false);
      setIsCustomerInfoExpanded(true);

      // Refresh orders list
      window.location.reload();
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

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-lg font-semibold text-gray-900">
          Loading enhanced ordering system...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-lg font-semibold mb-4">
          Error Loading Enhanced System
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Enhanced Order Management
        </h1>
        <div className="mt-2 text-base md:text-lg text-gray-800">
          <span className="font-semibold">{restaurant?.name}</span> •
          <span className="ml-2">
            Cart:{" "}
            <span className="font-semibold text-blue-600">
              {cartStats.totalItems} items
            </span>
          </span>{" "}
          •
          <span className="ml-2">
            Menu:{" "}
            <span className="font-semibold text-green-600">
              {menuItems.length} items
            </span>
          </span>
        </div>
      </div>

      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Customer Information Panel */}
        <div className="lg:col-span-3">
          <CustomerInformationPanel
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
            foundCustomer={foundCustomer}
            lookupLoading={lookupLoading}
            customerLookupStatus={customerLookupStatus}
            customerAddresses={customerAddresses}
            orderType={orderType}
            handleOrderTypeChange={handleOrderTypeChange}
            orderTypeAutoSuggested={orderTypeAutoSuggested}
            deliveryAddress={deliveryAddress}
            setDeliveryAddress={setDeliveryAddress}
            selectedAddressId={selectedAddressId}
            handleAddressSelection={handleAddressSelection}
            isCustomerInfoExpanded={isCustomerInfoExpanded}
            setIsCustomerInfoExpanded={setIsCustomerInfoExpanded}
            customerInfoConfirmed={customerInfoConfirmed}
            handleConfirmCustomer={handleConfirmCustomer}
          />
        </div>

        {/* Menu Items Selector - Only visible when customer is confirmed */}
        {customerInfoConfirmed && (
          <div className="lg:col-span-2">
            <EnhancedMenuItemSelector
              menuItems={menuItems}
              toppings={toppings}
              modifiers={modifiers}
              onAddToCart={handleAddToCart}
            />
          </div>
        )}

        {/* Enhanced Cart System - Only visible when customer is confirmed */}
        {customerInfoConfirmed && (
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <EnhancedCartSystem
                items={cartItems}
                onUpdateItem={handleUpdateCartItem}
                onRemoveItem={handleRemoveCartItem}
                restaurantId={restaurant?.id || ""}
                orderSummary={orderSummary}
              />

              {/* Submit Order Button */}
              {cartItems.length > 0 && (
                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-lg text-lg font-bold transition-all ${
                    !isSubmitting
                      ? "bg-green-600 hover:bg-green-700 text-white transform hover:scale-105"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting
                    ? "Creating Order..."
                    : `Submit Order - $${orderSummary.total.toFixed(2)}`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Placeholder when customer not confirmed */}
        {!customerInfoConfirmed && (
          <div className="lg:col-span-3 flex flex-col items-center justify-center text-center p-12 bg-gray-100 rounded-lg">
            <div className="text-6xl mb-6">👤</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Customer Information Required
            </h2>
            <p className="text-gray-600 text-lg">
              Please confirm customer details to access the enhanced ordering
              system
            </p>
          </div>
        )}
      </div>

      {/* Recent Orders Toggle */}
      <div className="mt-8 text-right">
        <button
          onClick={() => setIsRecentOrdersVisible(!isRecentOrdersVisible)}
          className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-4 py-2 rounded-md text-sm font-medium"
        >
          {isRecentOrdersVisible ? "Hide Recent Orders" : "Show Recent Orders"}
        </button>
      </div>

      {/* Recent Orders Panel */}
      {isRecentOrdersVisible && (
        <div className="mt-6 bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Orders
            </h2>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.slice(0, 12).map((order) => (
                <SimpleOrderCard key={order.id} order={order} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Customer Information Panel Component
 *
 * This component encapsulates all the customer management logic in a clean,
 * collapsible panel. It maintains the same functionality as your original
 * system while fitting into the new architecture.
 */
interface CustomerInformationPanelProps {
  customerInfo: { name: string; phone: string; email: string };
  setCustomerInfo: React.Dispatch<
    React.SetStateAction<{ name: string; phone: string; email: string }>
  >;
  foundCustomer: Customer | null;
  lookupLoading: boolean;
  customerLookupStatus: "idle" | "searching" | "found" | "not-found";
  customerAddresses: CustomerAddress[];
  orderType: "pickup" | "delivery";
  handleOrderTypeChange: (type: "pickup" | "delivery") => void;
  orderTypeAutoSuggested: boolean;
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
  handleAddressSelection: (addressId: string) => void;
  isCustomerInfoExpanded: boolean;
  setIsCustomerInfoExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  customerInfoConfirmed: boolean;
  handleConfirmCustomer: () => void;
}

function CustomerInformationPanel(props: CustomerInformationPanelProps) {
  const {
    customerInfo,
    setCustomerInfo,
    foundCustomer,
    lookupLoading,
    customerLookupStatus,
    customerAddresses,
    orderType,
    handleOrderTypeChange,
    orderTypeAutoSuggested,
    deliveryAddress,
    setDeliveryAddress,

    handleAddressSelection,
    isCustomerInfoExpanded,
    setIsCustomerInfoExpanded,
    customerInfoConfirmed,
    handleConfirmCustomer,
  } = props;
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Panel Header */}
      <div
        className="flex justify-between items-center p-6 border-b border-gray-200 cursor-pointer"
        onClick={() => setIsCustomerInfoExpanded(!isCustomerInfoExpanded)}
      >
        <h2 className="text-xl font-semibold text-gray-900">
          {customerInfoConfirmed && !isCustomerInfoExpanded
            ? `Order for: ${customerInfo.name} (${customerInfo.phone})`
            : "Customer Information"}
        </h2>
        <div className="flex items-center gap-2">
          {customerInfoConfirmed && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              ✓ Confirmed
            </span>
          )}
          <span className="text-blue-600 text-sm">
            {isCustomerInfoExpanded ? "▲ Collapse" : "▼ Expand"}
          </span>
        </div>
      </div>

      {/* Panel Content */}
      {isCustomerInfoExpanded && (
        <div className="p-6 space-y-6">
          {/* Customer Details Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Customer Details
              </h3>

              <div>
                <label className={labelStyles}>Phone Number *</label>
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
                    className={inputStyles}
                    required
                    disabled={customerInfoConfirmed}
                  />
                  {lookupLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {customerLookupStatus === "searching" && (
                  <p className="text-sm text-blue-600 mt-1">Searching...</p>
                )}
                {customerLookupStatus === "found" && foundCustomer && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Customer: {foundCustomer.name} (
                    {foundCustomer.total_orders} orders)
                  </p>
                )}
                {customerLookupStatus === "not-found" &&
                  customerInfo.phone.length >= 10 && (
                    <p className="text-sm text-gray-700 mt-1">New customer</p>
                  )}
              </div>

              <div>
                <label className={labelStyles}>Customer Name *</label>
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
                  className={inputStyles}
                  required
                  disabled={customerInfoConfirmed}
                />
              </div>

              <div>
                <label className={labelStyles}>Email (optional)</label>
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={customerInfo.email}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className={inputStyles}
                  disabled={customerInfoConfirmed}
                />
              </div>

              {foundCustomer && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-800">
                    <div>Loyalty Points: {foundCustomer.loyalty_points}</div>
                    <div>Total Orders: {foundCustomer.total_orders}</div>
                    <div>Saved Addresses: {customerAddresses.length}</div>
                    {customerAddresses.length > 0 &&
                      orderType === "pickup" &&
                      orderTypeAutoSuggested && (
                        <button
                          onClick={() => handleOrderTypeChange("delivery")}
                          className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        >
                          Suggest Delivery?
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Order Type and Delivery */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Order Type</h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOrderTypeChange("pickup")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    orderType === "pickup"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                >
                  <span className="font-medium text-gray-900 block">
                    Pickup
                  </span>
                  <span className="text-sm text-gray-700">~25 min</span>
                </button>
                <button
                  onClick={() => handleOrderTypeChange("delivery")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    orderType === "delivery"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                >
                  <span className="font-medium text-gray-900 block">
                    Delivery
                  </span>
                  <span className="text-sm text-gray-700">
                    +$3.99 • ~45 min
                    {customerAddresses.length > 0 &&
                      ` • ${customerAddresses.length} saved`}
                  </span>
                </button>
              </div>

              {/* Delivery Address Section */}
              {orderType === "delivery" && (
                <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">
                    Delivery Address
                  </h4>

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
                            onChange={() => handleAddressSelection(addr.id)}
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
                            {addr.is_default && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
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
                          onChange={() => {
                            setSelectedAddressId(null);
                            setDeliveryAddress({
                              address: "",
                              city: "",
                              zip: "",
                              instructions: "",
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          Enter new address
                        </span>
                      </label>
                    </div>
                  )}

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
                      className={inputStyles}
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
                        className={inputStyles}
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
                        className={inputStyles}
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
                      className={inputStyles}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Button */}
          {!customerInfoConfirmed && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleConfirmCustomer}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold text-lg transition-colors"
              >
                Confirm Customer & Continue to Menu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple Order Card Component
 *
 * Displays recent orders in a clean, readable format.
 */
function SimpleOrderCard({ order }: { order: OrderWithItems }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-orange-100 text-orange-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">#{order.order_number}</h4>
          <p className="text-sm text-gray-600">{timeAgo(order.created_at)}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
            order.status
          )}`}
        >
          {order.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Customer:</span> {order.customer_name}
        </p>
        <p>
          <span className="font-medium">Type:</span> {order.order_type}
        </p>
        <p>
          <span className="font-medium">Total:</span>
          <span className="text-green-600 font-bold ml-1">
            ${order.total.toFixed(2)}
          </span>
        </p>
        <p>
          <span className="font-medium">Items:</span>{" "}
          {order.order_items?.length || 0}
        </p>
      </div>
    </div>
  );
}

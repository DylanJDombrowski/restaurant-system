"use client";
import { useCallback, useEffect, useState } from "react";
import {
  MenuItemWithCategory,
  Restaurant,
  OrderWithItems,
  Customer,
  CustomerAddress,
} from "@/lib/types";

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

export default function StaffOrdersPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecentOrdersVisible, setIsRecentOrdersVisible] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        const restaurantResponse = await fetch("/api/restaurants");
        if (!restaurantResponse.ok) {
          throw new Error(`Restaurant API error: ${restaurantResponse.status}`);
        }
        const restaurantData = await restaurantResponse.json();
        setRestaurant(restaurantData.data);

        const menuResponse = await fetch(
          `/api/menu?restaurant_id=${restaurantData.data.id}&available_only=true`
        );
        if (!menuResponse.ok) {
          throw new Error(`Menu API error: ${menuResponse.status}`);
        }
        const menuData = await menuResponse.json();
        setMenuItems(menuData.data || []);

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
        <div className="text-lg font-semibold text-gray-900">
          Loading restaurant data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-lg font-semibold mb-4">
          Error Loading Data
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
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Staff Order Management
        </h1>
        <div className="mt-2 text-base md:text-lg text-gray-800">
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

      {/* Main content area using a single top-level grid for OrderCreationForm and RecentOrders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          <OrderCreationForm
            menuItems={menuItems}
            restaurantId={restaurant?.id || ""}
            onOrderCreated={() => {
              // Consider a more subtle way to refresh data if possible,
              // but window.location.reload() works for now.
              window.location.reload();
            }}
          />
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">
              Recent Orders
            </h2>
            <button
              onClick={() => setIsRecentOrdersVisible(!isRecentOrdersVisible)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isRecentOrdersVisible ? "Hide" : "Show"}
            </button>
            {isRecentOrdersVisible && (
              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {" "}
                {/* Adjusted max height */}
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-lg">
                      No orders yet today
                    </div>
                    <p className="text-gray-700 text-sm mt-2">
                      Create your first order!
                    </p>
                  </div>
                ) : (
                  orders
                    .slice(0, 10)
                    .map((order) => <OrderCard key={order.id} order={order} />)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility function for distance calculation - this can stay at the top level
// because it's not a React hook
// const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
//   const R = 3959; // Earth's radius in miles
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// };

// Enhanced Order Creation Form with Customer Lookup & Delivery Address
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
      justAdded?: boolean;
    }>
  >([]);
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
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

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
          )}&restaurant_id=${restaurantId}`
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
    [restaurantId, orderType, orderTypeAutoSuggested]
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
      if (customerInfo.phone) {
        lookupCustomer(customerInfo.phone);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [customerInfo.phone, lookupCustomer]);

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
    setRecentlyAdded(menuItem.id);
    setTimeout(() => {
      setRecentlyAdded(null);
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
    const tax = subtotal * 0.08; // Assuming 8% tax
    const deliveryFee = orderType === "delivery" ? 3.99 : 0;
    return { subtotal, tax, deliveryFee, total: subtotal + tax + deliveryFee };
  };

  const handleSubmit = async () => {
    if (
      selectedItems.length === 0 ||
      !customerInfo.name ||
      !customerInfo.phone
    ) {
      alert("Please add items and fill in customer information."); // Keep this for user feedback
      return;
    }
    if (
      orderType === "delivery" &&
      (!deliveryAddress.address ||
        !deliveryAddress.city ||
        !deliveryAddress.zip)
    ) {
      alert("Please fill in the delivery address."); // Keep this
      return;
    }

    setIsSubmitting(true);
    try {
      const { subtotal, tax, deliveryFee, total } = calculateTotal();
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
        status: "pending" as const, // Ensure status is of type OrderStatus
        ...(orderType === "delivery" && {
          customer_address: deliveryAddress.address,
          customer_city: deliveryAddress.city,
          customer_zip: deliveryAddress.zip,
          delivery_instructions: deliveryAddress.instructions || null,
        }),
      };
      const orderItemsData = selectedItems.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        unitPrice: item.menuItem.base_price,
        specialInstructions: null, // Add if you have special instructions per item
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

      setSelectedItems([]);
      setCustomerInfo({ name: "", phone: "", email: "" });
      setOrderType("pickup");
      setDeliveryAddress({ address: "", city: "", zip: "", instructions: "" });
      setFoundCustomer(null);
      setCustomerAddresses([]);
      setSelectedAddressId(null);
      setCustomerLookupStatus("idle");
      setOrderTypeAutoSuggested(false);
      onOrderCreated();
      // Removed alert("Order created successfully!");
    } catch (error) {
      console.error("Error creating order:", error);
      alert(
        `Error creating order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      ); // Keep error alert
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotal();
  const canSubmit =
    selectedItems.length > 0 &&
    customerInfo.name &&
    customerInfo.phone &&
    (orderType === "pickup" ||
      (deliveryAddress.address && deliveryAddress.city && deliveryAddress.zip));

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">
        Create New Order
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Customer, Order Type, Delivery Address (Span 4 of 12 on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer Information Section */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Information
            </h3>
            <div className="space-y-4">
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
                    <p className="text-sm text-gray-700 mt-1">New customer.</p>
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
                />
              </div>
            </div>
            {foundCustomer && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                Loyalty Points: {foundCustomer.loyalty_points} | Addresses
                Saved: {customerAddresses.length}
                {customerAddresses.length > 0 &&
                  orderType === "pickup" &&
                  orderTypeAutoSuggested && (
                    <button
                      onClick={() => handleOrderTypeChange("delivery")}
                      className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                    >
                      Suggest Delivery?
                    </button>
                  )}
              </div>
            )}
          </div>

          {/* Order Type Selection */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Order Type
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOrderTypeChange("pickup")}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  orderType === "pickup"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                <span className="font-medium text-gray-900 block">Pickup</span>
                <span className="text-xs text-gray-700">~25 min</span>
              </button>
              <button
                onClick={() => handleOrderTypeChange("delivery")}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  orderType === "delivery"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                <span className="font-medium text-gray-900 block">
                  Delivery
                </span>
                <span className="text-xs text-gray-700">
                  +$3.99{" "}
                  {customerAddresses.length > 0
                    ? `(${customerAddresses.length} saved)`
                    : ""}
                </span>
              </button>
            </div>
          </div>

          {/* Delivery Address Section */}
          <div
            className={`border rounded-lg transition-all duration-300 space-y-4 ${
              orderType === "delivery"
                ? "bg-yellow-50 border-yellow-200 p-4"
                : "bg-gray-100 p-4 opacity-70"
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Delivery Address{" "}
              {orderType === "pickup" && (
                <span className="text-sm font-normal text-gray-700">
                  (for Delivery orders)
                </span>
              )}
            </h3>
            {orderType === "delivery" && customerAddresses.length > 0 && (
              <div className="space-y-2">
                <label className={labelStyles}>Saved Addresses</label>
                {customerAddresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start space-x-3 p-2 rounded-lg border cursor-pointer ${
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
                        <div className="text-xs text-blue-700">
                          {addr.delivery_instructions}
                        </div>
                      )}
                      {addr.is_default && (
                        <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </label>
                ))}
                <label
                  className={`flex items-center p-2 rounded-lg border cursor-pointer ${
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
            <div>
              <label className={labelStyles}>
                Street Address {orderType === "delivery" && "*"}
              </label>
              <input
                type="text"
                placeholder="123 Main Street"
                value={deliveryAddress.address}
                onChange={(e) =>
                  setDeliveryAddress((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                disabled={orderType === "pickup"}
                className={inputStyles}
                required={orderType === "delivery"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyles}>
                  City {orderType === "delivery" && "*"}
                </label>
                <input
                  type="text"
                  placeholder="New Lenox"
                  value={deliveryAddress.city}
                  onChange={(e) =>
                    setDeliveryAddress((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  disabled={orderType === "pickup"}
                  className={inputStyles}
                  required={orderType === "delivery"}
                />
              </div>
              <div>
                <label className={labelStyles}>
                  ZIP {orderType === "delivery" && "*"}
                </label>
                <input
                  type="text"
                  placeholder="60451"
                  value={deliveryAddress.zip}
                  onChange={(e) =>
                    setDeliveryAddress((prev) => ({
                      ...prev,
                      zip: e.target.value,
                    }))
                  }
                  disabled={orderType === "pickup"}
                  className={inputStyles}
                  required={orderType === "delivery"}
                />
              </div>
            </div>
            <div>
              <label className={labelStyles}>Delivery Instructions</label>
              <textarea
                placeholder="Apt #, gate code..."
                value={deliveryAddress.instructions}
                onChange={(e) =>
                  setDeliveryAddress((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
                disabled={orderType === "pickup"}
                rows={2}
                className={inputStyles}
              />
            </div>
          </div>
        </div>

        {/* Column 2: Menu Items (Span 4 of 12 on lg) */}
        <div className="lg:col-span-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Menu Items
            </h3>
            <div className="space-y-3 max-h-[600px] lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              {" "}
              {/* Scrollable Menu */}
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white border rounded-lg p-3 transition-all duration-300 ${
                    recentlyAdded === item.id
                      ? "border-green-500 shadow-lg"
                      : "border-gray-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-700">
                        {item.description}
                      </p>
                      <p className="text-md font-bold text-green-600 mt-1">
                        ${item.base_price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => addItem(item)}
                      className={`ml-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        recentlyAdded === item.id
                          ? "bg-green-600 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {recentlyAdded === item.id ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Order Summary (Span 4 of 12 on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {selectedItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Current Order ({selectedItems.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {" "}
                {/* Scrollable Cart */}
                {selectedItems.map((item) => (
                  <div
                    key={item.menuItem.id}
                    className={`flex justify-between items-center bg-white p-2.5 rounded-lg border ${
                      item.justAdded ? "border-green-500" : "border-gray-200"
                    }`}
                  >
                    <div className="flex-1">
                      <span className="font-medium text-sm text-gray-900">
                        {item.menuItem.name}
                      </span>
                      <div className="text-xs text-gray-700">
                        ${item.menuItem.base_price.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.menuItem.id, item.quantity - 1)
                        }
                        className="bg-gray-200 hover:bg-gray-300 w-7 h-7 rounded-full text-sm font-bold"
                      >
                        -
                      </button>
                      <span className="font-semibold text-sm w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.menuItem.id, item.quantity + 1)
                        }
                        className="bg-gray-200 hover:bg-gray-300 w-7 h-7 rounded-full text-sm font-bold"
                      >
                        +
                      </button>
                      <span className="font-bold text-sm text-green-600 ml-2 w-16 text-right">
                        ${(item.menuItem.base_price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.menuItem.id)}
                        className="bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded-full text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-md">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-800">Subtotal:</span>
                <span className="font-semibold text-gray-900">
                  ${totals.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-800">Tax (8%):</span>
                <span className="font-semibold text-gray-900">
                  ${totals.tax.toFixed(2)}
                </span>
              </div>
              {orderType === "delivery" && (
                <div className="flex justify-between">
                  <span className="text-gray-800">Delivery Fee:</span>
                  <span className="font-semibold text-gray-900">
                    ${totals.deliveryFee.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-green-600">
                    ${totals.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className={`w-full mt-4 py-3 rounded-lg text-md font-bold transition-all ${
                canSubmit && !isSubmitting
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isSubmitting
                ? "Creating..."
                : canSubmit
                ? "Submit Order"
                : "Complete Form"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    completed: "bg-gray-200 text-gray-900 border-gray-300", // Darker text
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-lg text-gray-900">
          #{order.order_number}
        </h4>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold border ${
            statusColors[order.status as keyof typeof statusColors]
          }`}
        >
          {order.status.toUpperCase()}
        </span>
      </div>
      <div className="space-y-1 text-sm text-gray-800">
        <p>
          <span className="font-medium">Customer:</span> {order.customer_name}
        </p>
        <p>
          <span className="font-medium">Phone:</span> {order.customer_phone}
        </p>
        <p>
          <span className="font-medium">Type:</span> {order.order_type}
        </p>
        {order.order_type === "delivery" && order.customer_address && (
          <p>
            <span className="font-medium">Address:</span>{" "}
            {order.customer_address}, {order.customer_city} {order.customer_zip}
          </p>
        )}
        <p>
          <span className="font-medium">Total:</span>{" "}
          <span className="text-green-600 font-bold">
            ${order.total.toFixed(2)}
          </span>
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

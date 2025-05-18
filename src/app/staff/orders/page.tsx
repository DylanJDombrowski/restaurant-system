"use client";
import { useCallback, useEffect, useState } from "react";
import {
  MenuItemWithCategory,
  Restaurant,
  OrderWithItems,
  Customer,
  CustomerAddress,
} from "@/lib/types";

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

        // Get restaurant using API route
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

// Utility function for distance calculation - this can stay at the top level
// because it's not a React hook
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

  // Enhanced customer info state
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // Customer lookup state
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>(
    []
  );

  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");

  // Delivery address state
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

  // Address validation state - now properly inside the component
  const [addressValidation, setAddressValidation] = useState<{
    isValidating: boolean;
    distance: number | null;
    isInDeliveryArea: boolean;
    overrideDelivery: boolean;
  }>({
    isValidating: false,
    distance: null,
    isInDeliveryArea: true,
    overrideDelivery: false,
  });

  // Restaurant coordinates (you'll want to get these from your restaurant data)
  const RESTAURANT_COORDS = { lat: 41.5067, lng: -87.9673 }; // New Lenox, IL approximation
  const STANDARD_DELIVERY_RADIUS = 8; // miles

  // Customer lookup function - moved outside useEffect
  const lookupCustomer = useCallback(
    async (phone: string) => {
      if (phone.length < 10) {
        setFoundCustomer(null);
        setCustomerAddresses([]);
        return;
      }

      setLookupLoading(true);
      try {
        const response = await fetch(
          `/api/customers/lookup?phone=${encodeURIComponent(
            phone
          )}&restaurant_id=${restaurantId}`
        );
        const data = await response.json();

        if (data.data && data.data.customer) {
          setFoundCustomer(data.data.customer);
          setCustomerInfo({
            name: data.data.customer.name || "",
            phone: data.data.customer.phone,
            email: data.data.customer.email || "",
          });

          // Load customer addresses
          const addressResponse = await fetch(
            `/api/customers/${data.data.customer.id}/addresses`
          );
          const addressData = await addressResponse.json();
          setCustomerAddresses(addressData.data?.addresses || []);
        } else {
          setFoundCustomer(null);
          setCustomerAddresses([]);
        }
      } catch (error) {
        console.error("Error looking up customer:", error);
      } finally {
        setLookupLoading(false);
      }
    },
    [restaurantId]
  );

  // Address validation function - wrapped in useCallback to fix dependency warning
  const validateDeliveryAddress = useCallback(
    async (address: string, city: string, zip: string) => {
      if (!address || !city || !zip) return;

      setAddressValidation((prev) => ({ ...prev, isValidating: true }));

      try {
        // Simple geocoding using a free service (you might want to use Google Maps API later)
        const fullAddress = `${address}, ${city}, ${zip}`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            fullAddress
          )}`
        );
        const data = await response.json();

        if (data && data[0]) {
          const distance = calculateDistance(
            RESTAURANT_COORDS.lat,
            RESTAURANT_COORDS.lng,
            parseFloat(data[0].lat),
            parseFloat(data[0].lon)
          );

          setAddressValidation({
            isValidating: false,
            distance: Math.round(distance * 10) / 10,
            isInDeliveryArea: distance <= STANDARD_DELIVERY_RADIUS,
            overrideDelivery: false,
          });
        }
      } catch (error) {
        console.error("Error validating address:", error);
        setAddressValidation((prev) => ({
          ...prev,
          isValidating: false,
          distance: null,
          isInDeliveryArea: true, // Default to allowing if validation fails
        }));
      }
    },
    [RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng, STANDARD_DELIVERY_RADIUS]
  );

  // Handle address selection - wrapped in useCallback to fix dependency warning
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

  // Handle phone number change with debounced lookup - fixed dependencies
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerInfo.phone) {
        lookupCustomer(customerInfo.phone);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [customerInfo.phone, lookupCustomer]);

  // Effect to trigger validation when address changes - fixed dependencies
  useEffect(() => {
    if (
      deliveryAddress.address &&
      deliveryAddress.city &&
      deliveryAddress.zip
    ) {
      const timeoutId = setTimeout(() => {
        validateDeliveryAddress(
          deliveryAddress.address,
          deliveryAddress.city,
          deliveryAddress.zip
        );
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [
    deliveryAddress.address,
    deliveryAddress.city,
    deliveryAddress.zip,
    validateDeliveryAddress,
  ]);

  // Effect to auto-suggest delivery for customers with addresses - fixed dependencies
  useEffect(() => {
    if (foundCustomer && customerAddresses.length > 0) {
      const defaultAddress =
        customerAddresses.find((addr) => addr.is_default) ||
        customerAddresses[0];

      if (defaultAddress) {
        // Always populate the address fields when a customer is found
        handleAddressSelection(defaultAddress.id);

        // Only auto-switch to delivery if currently in pickup mode
        if (orderType === "pickup") {
          setOrderType("delivery");
        }
      }
    }
  }, [foundCustomer, customerAddresses, orderType, handleAddressSelection]);

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
    // Validation
    if (
      selectedItems.length === 0 ||
      !customerInfo.name ||
      !customerInfo.phone
    ) {
      alert("Please add items and fill in customer information");
      return;
    }

    if (
      orderType === "delivery" &&
      (!deliveryAddress.address ||
        !deliveryAddress.city ||
        !deliveryAddress.zip)
    ) {
      alert("Please fill in the delivery address");
      return;
    }

    setIsSubmitting(true);
    try {
      const { subtotal, tax, deliveryFee, total } = calculateTotal();

      // Prepare order data with delivery address
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
        // Add delivery address fields
        ...(orderType === "delivery" && {
          customer_address: deliveryAddress.address,
          customer_city: deliveryAddress.city,
          customer_zip: deliveryAddress.zip,
          delivery_instructions: deliveryAddress.instructions || null,
        }),
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
      setDeliveryAddress({ address: "", city: "", zip: "", instructions: "" });
      setFoundCustomer(null);
      setCustomerAddresses([]);
      setSelectedAddressId(null);
      // Reset address validation state
      setAddressValidation({
        isValidating: false,
        distance: null,
        isInDeliveryArea: true,
        overrideDelivery: false,
      });

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
    selectedItems.length > 0 &&
    customerInfo.name &&
    customerInfo.phone &&
    (orderType === "pickup" ||
      (deliveryAddress.address &&
        deliveryAddress.city &&
        deliveryAddress.zip &&
        (addressValidation.isInDeliveryArea ||
          addressValidation.overrideDelivery)));

  return (
    <div className="space-y-8">
      {/* Rest of your JSX stays exactly the same */}
      {/* I'm keeping the rest of your render logic unchanged since it was working correctly */}

      {/* Customer Information with Lookup */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Information
          {foundCustomer && (
            <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
              ✓ Found: {foundCustomer.total_orders} orders •{" "}
              {foundCustomer.loyalty_points} points
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {lookupLoading && (
                <div className="absolute right-3 top-2">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
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
                setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
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

        {/* Customer History & Quick Actions */}
        {foundCustomer && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="text-sm text-blue-900">
                <span className="font-medium">Loyalty:</span>{" "}
                {foundCustomer.loyalty_points} points •
                <span className="font-medium ml-2">Total Spent:</span> $
                {foundCustomer.total_spent}
              </div>
              <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                View Order History
              </button>
            </div>
          </div>
        )}
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

      {/* Delivery Address Section */}
      {orderType === "delivery" && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Delivery Address
          </h3>

          {/* Saved Addresses for existing customers */}
          {customerAddresses.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saved Addresses
              </label>
              <div className="space-y-2">
                {customerAddresses.map((address) => (
                  <label
                    key={address.id}
                    className="flex items-start space-x-2"
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      value={address.id}
                      checked={selectedAddressId === address.id}
                      onChange={() => handleAddressSelection(address.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {address.address}
                      </div>
                      <div className="text-xs text-gray-600">
                        {address.city}, {address.zip}
                        {address.delivery_instructions && (
                          <span className="ml-2 text-blue-600">
                            • {address.delivery_instructions}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-yellow-300">
                <label className="flex items-center">
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
                  <span className="text-sm font-medium">Enter new address</span>
                </label>
              </div>
            </div>
          )}

          {/* Address Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code *
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Instructions (optional)
              </label>
              <textarea
                placeholder="Apartment #, gate code, special instructions..."
                value={deliveryAddress.instructions}
                onChange={(e) =>
                  setDeliveryAddress((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Address Validation Display */}
          {orderType === "delivery" && addressValidation.distance !== null && (
            <div
              className={`mt-4 p-3 rounded-lg border ${
                addressValidation.isInDeliveryArea ||
                addressValidation.overrideDelivery
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      addressValidation.isInDeliveryArea ||
                      addressValidation.overrideDelivery
                        ? "bg-green-500"
                        : "bg-yellow-500"
                    }`}
                  ></span>
                  <span className="text-sm font-medium">
                    Distance: {addressValidation.distance} miles from restaurant
                  </span>
                </div>

                {!addressValidation.isInDeliveryArea && (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={addressValidation.overrideDelivery}
                      onChange={(e) =>
                        setAddressValidation((prev) => ({
                          ...prev,
                          overrideDelivery: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">Override delivery limit</span>
                  </label>
                )}
              </div>

              {!addressValidation.isInDeliveryArea &&
                !addressValidation.overrideDelivery && (
                  <p className="text-sm text-yellow-800 mt-2">
                    ⚠️ This address is outside our standard delivery area (8
                    miles). Check with customer about additional delivery fees
                    or pickup option.
                  </p>
                )}
            </div>
          )}
        </div>
      )}

      {/* Menu Items */}
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

      {/* Selected Items */}
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
          ) : !customerInfo.name || !customerInfo.phone ? (
            "Fill in customer information"
          ) : (
            "Complete delivery address"
          )}
        </button>
      </div>
    </div>
  );
}

// Order Card Component (unchanged)
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
        {order.order_type === "delivery" && order.customer_address && (
          <p>
            <span className="font-medium">Address:</span>{" "}
            {order.customer_address}, {order.customer_city} {order.customer_zip}
          </p>
        )}
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

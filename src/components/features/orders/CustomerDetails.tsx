// src/components/features/orders/CustomerDetails.tsx
"use client";
import { Customer } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

/**
 * 🆕 ENHANCED CUSTOMER DETAILS COMPONENT
 *
 * Handles both customer info and delivery addresses in one clean interface.
 * Expanded from InlineCustomerInfo to include delivery functionality.
 */

interface DeliveryAddress {
  address: string;
  city: string;
  zip: string;
  instructions: string;
}

interface CustomerAddress {
  id: string;
  address: string;
  city: string;
  zip: string;
  delivery_instructions?: string;
  is_default: boolean;
}

interface CustomerDetailsProps {
  customerInfo: { name: string; phone: string; email: string };
  setCustomerInfo: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string }>>;
  foundCustomer: Customer | null;
  onCustomerLookup: (phone: string) => void;
  lookupLoading: boolean;
  customerLookupStatus: "idle" | "searching" | "found" | "not-found";
  restaurantId: string;
  // New delivery props
  orderType: "pickup" | "delivery";
  deliveryAddress: DeliveryAddress;
  setDeliveryAddress: React.Dispatch<React.SetStateAction<DeliveryAddress>>;
}

export default function CustomerDetails({
  customerInfo,
  setCustomerInfo,
  foundCustomer,
  onCustomerLookup,
  lookupLoading,
  customerLookupStatus,
  restaurantId,
  orderType,
  deliveryAddress,
  setDeliveryAddress,
}: CustomerDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [previousAddresses, setPreviousAddresses] = useState<CustomerAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);

  // Show suggestion to add customer info when cart has items
  useEffect(() => {
    if (!customerInfo.phone && !isExpanded) {
      const timer = setTimeout(() => setShowSuggestion(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowSuggestion(false);
    }
  }, [customerInfo.phone, isExpanded]);

  // Auto-lookup when phone reaches 10 digits
  useEffect(() => {
    if (customerInfo.phone.length === 10) {
      onCustomerLookup(customerInfo.phone);
    }
  }, [customerInfo.phone, onCustomerLookup]);

  const loadPreviousAddresses = useCallback(
    async (customerId: string) => {
      try {
        setLoadingAddresses(true);
        const response = await fetch(`/api/customers/${customerId}/addresses`);
        if (response.ok) {
          const data = await response.json();
          setPreviousAddresses(data.data || []);

          // Auto-fill with default address if available and no address entered yet
          const defaultAddress = data.data?.find((addr: CustomerAddress) => addr.is_default);
          if (defaultAddress && !deliveryAddress.address) {
            setDeliveryAddress({
              address: defaultAddress.address,
              city: defaultAddress.city,
              zip: defaultAddress.zip,
              instructions: defaultAddress.delivery_instructions || "",
            });
          }
        }
      } catch (error) {
        console.error("Error loading previous addresses:", error);
      } finally {
        setLoadingAddresses(false);
      }
    },
    [deliveryAddress.address, setDeliveryAddress]
  );

  const loadAddressesByPhone = useCallback(
    async (phone: string) => {
      try {
        setLoadingAddresses(true);
        const response = await fetch(
          `/api/customers/lookup?phone=${encodeURIComponent(phone)}&restaurant_id=${restaurantId}&include_addresses=true`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.data?.addresses) {
            setPreviousAddresses(data.data.addresses);
          }
        }
      } catch (error) {
        console.error("Error loading addresses by phone:", error);
      } finally {
        setLoadingAddresses(false);
      }
    },
    [restaurantId]
  );

  // Load customer addresses when customer found and delivery is selected
  useEffect(() => {
    if (orderType === "delivery" && foundCustomer?.id) {
      loadPreviousAddresses(foundCustomer.id);
    } else if (orderType === "delivery" && customerInfo.phone.length === 10) {
      loadAddressesByPhone(customerInfo.phone);
    }
  }, [foundCustomer, customerInfo.phone, orderType, restaurantId, loadPreviousAddresses, loadAddressesByPhone]);

  const handleAddressSelect = (address: CustomerAddress) => {
    setDeliveryAddress({
      address: address.address,
      city: address.city,
      zip: address.zip,
      instructions: address.delivery_instructions || "",
    });
    setShowAddressSuggestions(false);
  };

  const getStatusColor = () => {
    if (foundCustomer) return "green";
    if (customerInfo.phone && customerLookupStatus === "not-found") return "blue";
    if (customerInfo.phone || customerInfo.name) return "yellow";
    return "gray";
  };

  const getStatusText = () => {
    if (foundCustomer) return `${foundCustomer.name} (${foundCustomer.total_orders} orders)`;
    if (customerInfo.phone && customerLookupStatus === "not-found") return "New Customer";
    if (customerInfo.name) return customerInfo.name;
    if (customerInfo.phone) return customerInfo.phone;
    return "Add Customer Info";
  };

  const isDeliveryComplete = () => {
    return orderType === "pickup" || (deliveryAddress.address && deliveryAddress.city && deliveryAddress.zip);
  };

  const statusColor = getStatusColor();

  return (
    <div className="bg-white border border-gray-300 rounded-lg">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
          isExpanded ? "border-b border-gray-200" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              statusColor === "green"
                ? "bg-green-500"
                : statusColor === "blue"
                ? "bg-blue-500"
                : statusColor === "yellow"
                ? "bg-yellow-500"
                : "bg-gray-300"
            }`}
          />

          <div className="text-left">
            <div className="font-medium text-gray-900 flex items-center">
              {getStatusText()}
              {orderType === "delivery" && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">🚚 Delivery</span>
              )}
            </div>
            {foundCustomer && (
              <div className="text-sm text-gray-600">
                {foundCustomer.loyalty_points} points • Last order:{" "}
                {foundCustomer.last_order_date ? new Date(foundCustomer.last_order_date).toLocaleDateString() : "Never"}
              </div>
            )}
            {orderType === "delivery" && !isDeliveryComplete() && <div className="text-sm text-red-600">⚠️ Delivery address required</div>}
            {!foundCustomer && !customerInfo.phone && showSuggestion && (
              <div className="text-sm text-blue-600 animate-pulse">Click to add customer info</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lookupLoading && <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />}
          <span className="text-gray-400">{isExpanded ? "−" : "+"}</span>
        </div>
      </button>

      {/* Expandable Content */}
      <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="p-4 space-y-4">
          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={customerInfo.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) {
                    setCustomerInfo((prev) => ({ ...prev, phone: value }));
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                {customerInfo.phone.length === 10 && (
                  <span className="text-xs text-gray-500">{customerInfo.phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}</span>
                )}
              </div>
            </div>

            {/* Lookup Status */}
            {customerLookupStatus === "found" && foundCustomer && (
              <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✓ Found existing customer: {foundCustomer.name}
                <br />
                <span className="text-xs text-green-600">
                  {foundCustomer.total_orders} previous orders, {foundCustomer.loyalty_points} loyalty points
                </span>
              </div>
            )}

            {customerLookupStatus === "not-found" && customerInfo.phone.length === 10 && (
              <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                ℹ New customer - please enter name below
              </div>
            )}
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              placeholder="Enter customer name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
            <input
              type="email"
              placeholder="customer@email.com"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 🆕 DELIVERY ADDRESS SECTION */}
          {orderType === "delivery" && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                🚚 Delivery Address
                {!isDeliveryComplete() && <span className="ml-2 text-sm text-red-600 font-normal">*Required</span>}
              </h4>

              {/* Previous Addresses */}
              {previousAddresses.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowAddressSuggestions(!showAddressSuggestions)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2"
                  >
                    {showAddressSuggestions ? "Hide" : "Use"} Previous Address ({previousAddresses.length})
                  </button>

                  {showAddressSuggestions && (
                    <div className="space-y-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      {previousAddresses.map((addr: CustomerAddress, index) => (
                        <button
                          key={index}
                          onClick={() => handleAddressSelect(addr)}
                          className="w-full text-left p-2 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{addr.address}</div>
                          <div className="text-sm text-gray-600">
                            {addr.city}, {addr.zip}
                          </div>
                          {addr.delivery_instructions && (
                            <div className="text-xs text-gray-500 italic">Note: {addr.delivery_instructions}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Address Form */}
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Street Address *"
                    value={deliveryAddress.address}
                    onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, address: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !deliveryAddress.address ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="City *"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, city: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !deliveryAddress.city ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                    }`}
                  />

                  <input
                    type="text"
                    placeholder="ZIP *"
                    value={deliveryAddress.zip}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 5) {
                        setDeliveryAddress((prev) => ({ ...prev, zip: value }));
                      }
                    }}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !deliveryAddress.zip ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                    }`}
                  />
                </div>

                <textarea
                  placeholder="Delivery instructions (optional)"
                  value={deliveryAddress.instructions}
                  onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, instructions: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Delivery Status */}
              {!isDeliveryComplete() && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  ⚠️ Please fill in all required address fields for delivery
                </div>
              )}

              {isDeliveryComplete() && orderType === "delivery" && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✅ Delivery address complete
                </div>
              )}

              {/* Delivery Fee Notice */}
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                📍 Delivery fee: $3.99 • Estimated time: 35-45 minutes
              </div>

              {loadingAddresses && (
                <div className="mt-2 text-sm text-gray-600 flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                  Loading previous addresses...
                </div>
              )}
            </div>
          )}

          {/* Loyalty Points Display */}
          {foundCustomer && foundCustomer.loyalty_points > 0 && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-purple-900">🎉 {foundCustomer.loyalty_points} Loyalty Points</div>
                  <div className="text-sm text-purple-700">
                    {foundCustomer.loyalty_points >= 100
                      ? "Can redeem for $10 off!"
                      : `${100 - foundCustomer.loyalty_points} points to next reward`}
                  </div>
                </div>
                {foundCustomer.loyalty_points >= 100 && (
                  <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">Apply Reward</button>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <button
              onClick={() => {
                setCustomerInfo({ name: "", phone: "", email: "" });
                setDeliveryAddress({ address: "", city: "", zip: "", instructions: "" });
                setIsExpanded(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>

            <button onClick={() => setIsExpanded(false)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

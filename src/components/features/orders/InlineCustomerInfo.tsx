// src/components/features/orders/InlineCustomerInfo.tsx
"use client";
import { useState, useEffect } from "react";
import { Customer } from "@/lib/types";

/**
 * 🆕 INLINE CUSTOMER INFO COMPONENT
 *
 * This component allows staff to add customer information during the order
 * without interrupting the flow. It can be collapsed/expanded and provides
 * the same lookup functionality as the modal, but inline.
 */

interface InlineCustomerInfoProps {
  customerInfo: { name: string; phone: string; email: string };
  setCustomerInfo: React.Dispatch<
    React.SetStateAction<{ name: string; phone: string; email: string }>
  >;
  foundCustomer: Customer | null;
  onCustomerLookup: (phone: string) => void;
  lookupLoading: boolean;
  customerLookupStatus: "idle" | "searching" | "found" | "not-found";
  restaurantId: string;
}

export default function InlineCustomerInfo({
  customerInfo,
  setCustomerInfo,
  foundCustomer,
  onCustomerLookup,
  lookupLoading,
  customerLookupStatus,
}: InlineCustomerInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Show suggestion to add customer info when cart has items
  useEffect(() => {
    if (!customerInfo.phone && !isExpanded) {
      const timer = setTimeout(() => setShowSuggestion(true), 5000); // Show after 5 seconds
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

  const getStatusColor = () => {
    if (foundCustomer) return "green";
    if (customerInfo.phone && customerLookupStatus === "not-found")
      return "blue";
    if (customerInfo.phone || customerInfo.name) return "yellow";
    return "gray";
  };

  const getStatusText = () => {
    if (foundCustomer)
      return `${foundCustomer.name} (${foundCustomer.total_orders} orders)`;
    if (customerInfo.phone && customerLookupStatus === "not-found")
      return "New Customer";
    if (customerInfo.name) return customerInfo.name;
    if (customerInfo.phone) return customerInfo.phone;
    return "Add Customer Info";
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
            <div className="font-medium text-gray-900">{getStatusText()}</div>
            {foundCustomer && (
              <div className="text-sm text-gray-600">
                {foundCustomer.loyalty_points} points • Last order:{" "}
                {foundCustomer.last_order_date
                  ? new Date(foundCustomer.last_order_date).toLocaleDateString()
                  : "Never"}
              </div>
            )}
            {!foundCustomer && !customerInfo.phone && showSuggestion && (
              <div className="text-sm text-blue-600 animate-pulse">
                Click to add customer info
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lookupLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
          <span className="text-gray-400">{isExpanded ? "−" : "+"}</span>
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 space-y-4">
          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={customerInfo.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // Only digits
                  if (value.length <= 10) {
                    setCustomerInfo((prev) => ({ ...prev, phone: value }));
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Format phone number display */}
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                {customerInfo.phone.length === 10 && (
                  <span className="text-xs text-gray-500">
                    {customerInfo.phone.replace(
                      /(\d{3})(\d{3})(\d{4})/,
                      "($1) $2-$3"
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Lookup Status */}
            {customerLookupStatus === "found" && foundCustomer && (
              <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✓ Found existing customer: {foundCustomer.name}
                <br />
                <span className="text-xs text-green-600">
                  {foundCustomer.total_orders} previous orders,{" "}
                  {foundCustomer.loyalty_points} loyalty points
                </span>
              </div>
            )}

            {customerLookupStatus === "not-found" &&
              customerInfo.phone.length === 10 && (
                <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  ℹ New customer - please enter name below
                </div>
              )}
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              placeholder="Enter customer name"
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (Optional)
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

          {/* Loyalty Points Display */}
          {foundCustomer && foundCustomer.loyalty_points > 0 && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-purple-900">
                    🎉 {foundCustomer.loyalty_points} Loyalty Points
                  </div>
                  <div className="text-sm text-purple-700">
                    {foundCustomer.loyalty_points >= 100
                      ? "Can redeem for $10 off!"
                      : `${
                          100 - foundCustomer.loyalty_points
                        } points to next reward`}
                  </div>
                </div>
                {foundCustomer.loyalty_points >= 100 && (
                  <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
                    Apply Reward
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <button
              onClick={() => {
                setCustomerInfo({ name: "", phone: "", email: "" });
                setIsExpanded(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Info
            </button>

            <button
              onClick={() => setIsExpanded(false)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

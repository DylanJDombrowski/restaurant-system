// src/components/features/orders/CustomerDetails.tsx - UPDATED with address passing
"use client";

import React, { useState, useEffect } from "react";
import {
  CustomerLoyaltyDetails,
  RecentCustomer,
  CustomerAddress,
} from "@/lib/types/loyalty";

interface CustomerDetailsProps {
  onCustomerSelected: (
    customer: CustomerLoyaltyDetails | null,
    address?: CustomerAddress
  ) => void; // ✅ Updated to pass address
  restaurantId: string;
}

interface CustomerLookupState {
  customer: CustomerLoyaltyDetails | null;
  isLoading: boolean;
  error: string | null;
  recentCustomers: RecentCustomer[];
  phoneInput: string;
}

export default function CustomerDetails({
  onCustomerSelected,
  restaurantId,
}: CustomerDetailsProps) {
  const [state, setState] = useState<CustomerLookupState>({
    customer: null,
    isLoading: false,
    error: null,
    recentCustomers: [],
    phoneInput: "",
  });

  // Load recent customers on mount
  useEffect(() => {
    loadRecentCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const loadRecentCustomers = async () => {
    try {
      const response = await fetch(
        `/api/customers/recent?restaurant_id=${restaurantId}`
      );
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          recentCustomers: data.data || [],
        }));
      }
    } catch (error) {
      console.error("Error loading recent customers:", error);
    }
  };

  const handlePhoneLookup = async (phone: string) => {
    if (!phone.trim()) {
      setState((prev) => ({ ...prev, customer: null, error: null }));
      onCustomerSelected(null);
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/customers/lookup?phone=${encodeURIComponent(
          phone
        )}&restaurant_id=${restaurantId}`
      );

      if (response.ok) {
        const data = await response.json();
        const customer = data.data as CustomerLoyaltyDetails;

        // ✅ Find the default address from the API response
        const defaultAddress = customer.addresses?.find(
          (addr: CustomerAddress) => addr.is_default
        );

        setState((prev) => ({
          ...prev,
          customer,
          isLoading: false,
          error: null,
        }));

        // ✅ Pass both customer and default address
        onCustomerSelected(customer, defaultAddress);
      } else if (response.status === 404) {
        // Customer not found - that's okay, we'll create a new one
        setState((prev) => ({
          ...prev,
          customer: null,
          isLoading: false,
          error: null,
        }));
        onCustomerSelected(null);
      } else {
        throw new Error("Failed to lookup customer");
      }
    } catch (error) {
      console.error("Customer lookup error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to lookup customer. Please try again.",
      }));
      onCustomerSelected(null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    setState((prev) => ({ ...prev, phoneInput: phone }));

    // Auto-lookup when phone number looks complete (10+ digits)
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length >= 10) {
      handlePhoneLookup(phone);
    } else if (digitsOnly.length === 0) {
      handlePhoneLookup("");
    }
  };

  const handleRecentCustomerSelect = (customer: RecentCustomer) => {
    setState((prev) => ({ ...prev, phoneInput: customer.phone }));
    handlePhoneLookup(customer.phone);
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
        6,
        10
      )}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Customer Information
      </h3>

      {/* Phone Input */}
      <div className="mb-4">
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-900 mb-2"
        >
          Customer Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={state.phoneInput}
          onChange={handlePhoneChange}
          placeholder="(555) 123-4567"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={state.isLoading}
        />
        {state.isLoading && (
          <p className="text-sm text-blue-600 mt-1">Looking up customer...</p>
        )}
        {state.error && (
          <p className="text-sm text-red-600 mt-1">{state.error}</p>
        )}
      </div>

      {/* Customer Details */}
      {state.customer && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-semibold text-green-900">
                {state.customer.name || "Customer Found"}
              </h4>
              <p className="text-sm text-green-700">
                {formatPhone(state.customer.phone)}
              </p>
              {state.customer.email && (
                <p className="text-sm text-green-700">{state.customer.email}</p>
              )}

              {/* ✅ Display addresses if available */}
              {state.customer.addresses &&
                state.customer.addresses.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 mb-1">
                      Saved Addresses:
                    </p>
                    {state.customer.addresses.map((addr) => (
                      <div key={addr.id} className="text-xs text-green-700">
                        {addr.is_default && "🏠 "}
                        {addr.label}: {addr.street}, {addr.city}
                      </div>
                    ))}
                  </div>
                )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-900">
                {state.customer.loyalty_points} points
              </div>
              <div className="text-xs text-green-600">
                ${Math.floor(state.customer.loyalty_points / 20)} available
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-600">Total Orders:</span>
              <span className="ml-1 font-medium">
                {state.customer.total_orders}
              </span>
            </div>
            <div>
              <span className="text-green-600">Total Spent:</span>
              <span className="ml-1 font-medium">
                ${state.customer.total_spent.toFixed(2)}
              </span>
            </div>
          </div>

          {state.customer.last_order_date && (
            <p className="text-xs text-green-600 mt-2">
              Last order: {formatDate(state.customer.last_order_date)}
            </p>
          )}
        </div>
      )}

      {/* Recent Customers */}
      {state.recentCustomers.length > 0 && !state.customer && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Recent Customers
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {state.recentCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleRecentCustomerSelect(customer)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">
                      {customer.name || formatPhone(customer.phone)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {customer.total_orders} orders • {customer.loyalty_points}{" "}
                      points
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(customer.last_order_date)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Guest Order Option */}
      {!state.customer && state.phoneInput.trim() === "" && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 Enter a phone number to link this order to a customer account and
            earn loyalty points.
            <br />
            <span className="text-xs">
              Or proceed without a phone number for a guest order.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// src/components/features/orders/OrderCompletionModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  ConfiguredCartItem,
  CustomerLoyaltyDetails,
  LoyaltyRedemption,
} from "@/lib/types";
import { CustomerAddress } from "@/lib/types/loyalty";

interface OrderCompletionModalProps {
  isOpen: boolean;
  cartItems: ConfiguredCartItem[];
  orderSummary: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    loyaltyDiscount?: number;
    total: number;
  };
  customer: CustomerLoyaltyDetails | null;
  pendingLoyaltyRedemption: LoyaltyRedemption | null;
  defaultOrderType: "pickup" | "delivery";
  deliveryAddress?: CustomerAddress;
  onConfirm: (orderData: {
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
  }) => void;
  onCancel: () => void;
  restaurantId: string;
}

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
}

interface DeliveryFormData {
  address: string;
  city: string;
  zip: string;
  instructions: string;
}

export default function OrderCompletionModal({
  isOpen,
  cartItems,
  orderSummary,
  customer,
  pendingLoyaltyRedemption,
  defaultOrderType,
  deliveryAddress,
  onConfirm,
  onCancel,
}: OrderCompletionModalProps) {
  // Form state
  const [customerForm, setCustomerForm] = useState<CustomerFormData>({
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
  });

  const [orderType, setOrderType] = useState<"pickup" | "delivery">(
    defaultOrderType
  );

  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormData>({
    address: "",
    city: "",
    zip: "",
    instructions: "",
  });

  // Loyalty state
  const [finalLoyaltyRedemption, setFinalLoyaltyRedemption] =
    useState<LoyaltyRedemption | null>(pendingLoyaltyRedemption);

  // Form validation
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
  }>({});

  // Update customer form when customer prop changes
  useEffect(() => {
    if (customer) {
      setCustomerForm({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
      });
    }
  }, [customer]);

  useEffect(() => {
    if (isOpen) {
      if (orderType === "delivery" && deliveryAddress) {
        console.log("🏠 Pre-filling delivery address:", deliveryAddress);
        setDeliveryForm({
          address: deliveryAddress.street || "",
          city: deliveryAddress.city || "",
          zip: deliveryAddress.zip_code || "",
          instructions: deliveryAddress.notes || "",
        });
      } else if (orderType === "pickup") {
        // Clear delivery form when switching to pickup
        setDeliveryForm({
          address: "",
          city: "",
          zip: "",
          instructions: "",
        });
      }
    }
  }, [isOpen, orderType, deliveryAddress]);

  // Calculate points to be earned
  const pointsToEarn = Math.floor(orderSummary.total);

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};

    if (!customerForm.name.trim()) {
      errors.name = "Customer name is required";
    }

    if (!customerForm.phone.trim()) {
      errors.phone = "Customer phone is required";
    } else if (customerForm.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Phone number must be at least 10 digits";
    }

    if (orderType === "delivery") {
      if (!deliveryForm.address.trim()) {
        errors.address = "Delivery address is required";
      }
      if (!deliveryForm.city.trim()) {
        errors.city = "City is required";
      }
      if (!deliveryForm.zip.trim()) {
        errors.zip = "ZIP code is required";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onConfirm({
      customerInfo: {
        name: customerForm.name,
        phone: customerForm.phone,
        email: customerForm.email || undefined,
      },
      orderType,
      deliveryAddress:
        orderType === "delivery"
          ? {
              address: deliveryForm.address,
              city: deliveryForm.city,
              zip: deliveryForm.zip,
              instructions: deliveryForm.instructions || undefined,
            }
          : undefined,
      loyaltyRedemption: finalLoyaltyRedemption || undefined,
    });
  };

  const handleLoyaltyRedemptionApply = async (points: number) => {
    if (!customer || points < 100) return;

    try {
      const response = await fetch(`/api/loyalty/calculate?points=${points}`);
      if (response.ok) {
        const data = await response.json();
        const redemption: LoyaltyRedemption = {
          points_to_redeem: points,
          discount_amount: Math.min(
            data.data.discount_amount,
            orderSummary.total
          ),
          conversion_rate: 20,
          remaining_points: customer.loyalty_points - points,
        };
        setFinalLoyaltyRedemption(redemption);
      }
    } catch (error) {
      console.error("Error calculating loyalty discount:", error);
    }
  };

  const handleLoyaltyRedemptionRemove = () => {
    setFinalLoyaltyRedemption(null);
  };

  if (!isOpen) return null;

  const finalTotal =
    orderSummary.total - (finalLoyaltyRedemption?.discount_amount || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Complete Order
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Please confirm customer information and order details
          </p>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Order Summary</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>{cartItems.length} items</span>
                <span>${orderSummary.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${orderSummary.tax.toFixed(2)}</span>
              </div>
              {orderSummary.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>${orderSummary.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {finalLoyaltyRedemption && (
                <div className="flex justify-between text-purple-600">
                  <span>🎁 Loyalty Discount</span>
                  <span>
                    -${finalLoyaltyRedemption.discount_amount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-green-600">${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, name: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter customer name"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="(555) 123-4567"
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.phone}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="customer@example.com"
                />
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Order Type</h3>
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

          {/* Delivery Address */}
          {orderType === "delivery" && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900">Delivery Address</h3>
                {deliveryAddress && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    🏠 Using saved address
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={deliveryForm.address}
                    onChange={(e) =>
                      setDeliveryForm({
                        ...deliveryForm,
                        address: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.address ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="123 Main Street"
                  />
                  {formErrors.address && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.city}
                      onChange={(e) =>
                        setDeliveryForm({
                          ...deliveryForm,
                          city: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.city ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Columbus"
                    />
                    {formErrors.city && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.zip}
                      onChange={(e) =>
                        setDeliveryForm({
                          ...deliveryForm,
                          zip: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.zip ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="43215"
                    />
                    {formErrors.zip && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.zip}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Delivery Instructions (Optional)
                  </label>
                  <textarea
                    value={deliveryForm.instructions}
                    onChange={(e) =>
                      setDeliveryForm({
                        ...deliveryForm,
                        instructions: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="e.g., Ring doorbell, Leave at door, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loyalty Section */}
          {customer && customer.loyalty_points >= 100 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Loyalty Points</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-medium text-blue-900">
                      Available: {customer.loyalty_points.toLocaleString()}{" "}
                      points
                    </div>
                    <div className="text-sm text-blue-600">
                      Worth up to ${Math.floor(customer.loyalty_points / 20)}{" "}
                      discount
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-600">
                      Will earn: {pointsToEarn} points
                    </div>
                  </div>
                </div>

                {finalLoyaltyRedemption ? (
                  <div className="bg-green-100 border border-green-300 rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-green-900">
                          Redeeming{" "}
                          {finalLoyaltyRedemption.points_to_redeem.toLocaleString()}{" "}
                          points
                        </div>
                        <div className="text-sm text-green-700">
                          ${finalLoyaltyRedemption.discount_amount.toFixed(2)}{" "}
                          discount applied
                        </div>
                      </div>
                      <button
                        onClick={handleLoyaltyRedemptionRemove}
                        className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <LoyaltyRedemptionSection
                    customer={customer}
                    orderTotal={orderSummary.total}
                    onApply={handleLoyaltyRedemptionApply}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
          >
            Complete Order - ${finalTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

// Loyalty Redemption Section Component
interface LoyaltyRedemptionSectionProps {
  customer: CustomerLoyaltyDetails;
  orderTotal: number;
  onApply: (points: number) => void;
}

function LoyaltyRedemptionSection({
  customer,
  orderTotal,
  onApply,
}: LoyaltyRedemptionSectionProps) {
  const [pointsInput, setPointsInput] = useState<string>("");
  const [calculatedDiscount, setCalculatedDiscount] = useState<number>(0);

  const handlePointsChange = (value: string) => {
    setPointsInput(value);
    const points = parseInt(value) || 0;

    if (points >= 100) {
      const discount = Math.min(Math.floor(points / 20), orderTotal);
      setCalculatedDiscount(discount);
    } else {
      setCalculatedDiscount(0);
    }
  };

  const handleApply = () => {
    const points = parseInt(pointsInput) || 0;
    if (points >= 100 && points <= customer.loyalty_points) {
      onApply(points);
    }
  };

  const maxPoints = Math.min(
    customer.loyalty_points,
    Math.floor(orderTotal * 20)
  );
  const quickOptions = [
    Math.floor((maxPoints * 0.25) / 100) * 100,
    Math.floor((maxPoints * 0.5) / 100) * 100,
    maxPoints,
  ].filter((p) => p >= 100);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-blue-700 mb-1">
          Points to Redeem (Minimum 100)
        </label>
        <input
          type="number"
          value={pointsInput}
          onChange={(e) => handlePointsChange(e.target.value)}
          min="100"
          max={customer.loyalty_points}
          step="100"
          className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter points to redeem"
        />
      </div>

      {quickOptions.length > 0 && (
        <div>
          <div className="text-xs text-blue-600 mb-2">Quick options:</div>
          <div className="flex gap-2">
            {quickOptions.map((points) => (
              <button
                key={points}
                onClick={() => handlePointsChange(points.toString())}
                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                {points.toLocaleString()} pts
              </button>
            ))}
          </div>
        </div>
      )}

      {calculatedDiscount > 0 && (
        <div className="text-sm text-green-700">
          <strong>${calculatedDiscount.toFixed(2)} discount</strong>
          <span className="text-xs ml-1">
            ({pointsInput} points = ${calculatedDiscount.toFixed(2)} off)
          </span>
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={
          calculatedDiscount === 0 ||
          parseInt(pointsInput) > customer.loyalty_points
        }
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors text-sm"
      >
        Apply {pointsInput} Points
      </button>
    </div>
  );
}

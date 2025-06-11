// src/components/features/orders/LoyaltyRedemption.tsx
"use client";

import React, { useState, useEffect } from "react";
import type { CustomerLoyaltyDetails, LoyaltyRedemption } from "@/lib/types";

interface LoyaltyRedemptionProps {
  customer: CustomerLoyaltyDetails;
  orderTotal: number;
  onRedemptionApply: (redemption: LoyaltyRedemption) => void;
  onRedemptionRemove: () => void;
  currentRedemption?: LoyaltyRedemption | null;
}

interface RedemptionState {
  pointsToRedeem: number;
  calculatedDiscount: number;
  isCalculating: boolean;
  error: string | null;
  suggestions: {
    quarter: number;
    half: number;
    max: number;
  };
}

export default function LoyaltyRedemptionComponent({
  customer,
  orderTotal,
  onRedemptionApply,
  onRedemptionRemove,
  currentRedemption,
}: LoyaltyRedemptionProps) {
  const [state, setState] = useState<RedemptionState>({
    pointsToRedeem: currentRedemption?.points_to_redeem || 0,
    calculatedDiscount: currentRedemption?.discount_amount || 0,
    isCalculating: false,
    error: null,
    suggestions: { quarter: 0, half: 0, max: 0 },
  });

  const REDEMPTION_RATE = 20; // 20 points = $1
  const MIN_REDEMPTION = 100; // minimum 100 points

  // Calculate suggestion amounts
  useEffect(() => {
    const maxPoints = Math.min(
      customer.loyalty_points,
      Math.floor(orderTotal * REDEMPTION_RATE)
    );

    setState((prev) => ({
      ...prev,
      suggestions: {
        quarter: Math.floor((maxPoints * 0.25) / 100) * 100, // Round to nearest 100
        half: Math.floor((maxPoints * 0.5) / 100) * 100,
        max: maxPoints,
      },
    }));
  }, [customer.loyalty_points, orderTotal]);

  const calculateDiscount = async (points: number) => {
    if (points < MIN_REDEMPTION) {
      setState((prev) => ({
        ...prev,
        calculatedDiscount: 0,
        error: `Minimum ${MIN_REDEMPTION} points required`,
      }));
      return;
    }

    if (points > customer.loyalty_points) {
      setState((prev) => ({
        ...prev,
        calculatedDiscount: 0,
        error: `Only ${customer.loyalty_points} points available`,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isCalculating: true, error: null }));

    try {
      const response = await fetch(`/api/loyalty/calculate?points=${points}`);

      if (response.ok) {
        const data = await response.json();
        const discount = Math.min(data.data.discount_amount, orderTotal);

        setState((prev) => ({
          ...prev,
          calculatedDiscount: discount,
          isCalculating: false,
          error: null,
        }));
      } else {
        throw new Error("Failed to calculate discount");
      }
    } catch (error) {
      console.error("Error calculating discount:", error);
      setState((prev) => ({
        ...prev,
        isCalculating: false,
        error: "Failed to calculate discount",
      }));
    }
  };

  const handlePointsChange = (points: number) => {
    setState((prev) => ({ ...prev, pointsToRedeem: points }));

    if (points === 0) {
      setState((prev) => ({ ...prev, calculatedDiscount: 0, error: null }));
      return;
    }

    // Debounce calculation
    const timeoutId = setTimeout(() => {
      calculateDiscount(points);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleApplyRedemption = () => {
    if (state.calculatedDiscount > 0 && !state.error) {
      const redemption: LoyaltyRedemption = {
        points_to_redeem: state.pointsToRedeem,
        discount_amount: state.calculatedDiscount,
        conversion_rate: REDEMPTION_RATE,
        remaining_points: customer.loyalty_points - state.pointsToRedeem,
      };
      onRedemptionApply(redemption);
    }
  };

  const handleSuggestionClick = (points: number) => {
    setState((prev) => ({ ...prev, pointsToRedeem: points }));
    calculateDiscount(points);
  };

  const formatPoints = (points: number) => points.toLocaleString();
  const maxAvailableDiscount = Math.min(
    orderTotal,
    Math.floor(customer.loyalty_points / REDEMPTION_RATE)
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-blue-900">
          Loyalty Points Redemption
        </h4>
        <div className="text-right text-sm">
          <div className="text-blue-700">
            Available: {formatPoints(customer.loyalty_points)} points
          </div>
          <div className="text-blue-600">
            Up to ${maxAvailableDiscount.toFixed(2)} discount
          </div>
        </div>
      </div>

      {customer.loyalty_points < MIN_REDEMPTION ? (
        <div className="text-sm text-blue-600">
          Customer needs {MIN_REDEMPTION - customer.loyalty_points} more points
          to redeem rewards.
        </div>
      ) : (
        <>
          {/* Points Input */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Points to Redeem
            </label>
            <input
              type="number"
              value={state.pointsToRedeem}
              onChange={(e) =>
                handlePointsChange(parseInt(e.target.value) || 0)
              }
              min={0}
              max={customer.loyalty_points}
              step={100}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Minimum ${MIN_REDEMPTION}`}
            />
            {state.error && (
              <p className="text-sm text-red-600 mt-1">{state.error}</p>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="mb-3">
            <div className="text-xs text-blue-600 mb-2">Quick options:</div>
            <div className="flex gap-2">
              {state.suggestions.quarter >= MIN_REDEMPTION && (
                <button
                  onClick={() =>
                    handleSuggestionClick(state.suggestions.quarter)
                  }
                  className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                >
                  {formatPoints(state.suggestions.quarter)} pts
                </button>
              )}
              {state.suggestions.half >= MIN_REDEMPTION && (
                <button
                  onClick={() => handleSuggestionClick(state.suggestions.half)}
                  className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                >
                  {formatPoints(state.suggestions.half)} pts
                </button>
              )}
              {state.suggestions.max >= MIN_REDEMPTION && (
                <button
                  onClick={() => handleSuggestionClick(state.suggestions.max)}
                  className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                >
                  Max: {formatPoints(state.suggestions.max)} pts
                </button>
              )}
            </div>
          </div>

          {/* Discount Preview */}
          {state.calculatedDiscount > 0 && (
            <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded">
              <div className="text-sm text-green-800">
                <strong>${state.calculatedDiscount.toFixed(2)} discount</strong>
                <br />
                <span className="text-xs">
                  {formatPoints(state.pointsToRedeem)} points = $
                  {state.calculatedDiscount.toFixed(2)} off
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {currentRedemption ? (
              <button
                onClick={onRedemptionRemove}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
              >
                Remove Redemption
              </button>
            ) : (
              <button
                onClick={handleApplyRedemption}
                disabled={
                  state.calculatedDiscount === 0 ||
                  !!state.error ||
                  state.isCalculating
                }
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors text-sm"
              >
                {state.isCalculating ? "Calculating..." : "Apply Points"}
              </button>
            )}
          </div>

          {/* Conversion Rate Info */}
          <div className="mt-2 text-xs text-blue-600 text-center">
            {REDEMPTION_RATE} points = $1.00 • Minimum {MIN_REDEMPTION} points
            to redeem
          </div>
        </>
      )}
    </div>
  );
}

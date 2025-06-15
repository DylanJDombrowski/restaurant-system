// src/components/features/orders/customizers/ToppingPlacementControl.tsx
// Dedicated component for fractional topping placement selection

"use client";
import { ToppingPlacement, getPlacementDisplayText, getPlacementMultiplier } from "@/lib/types/pizza";
import { useState } from "react";

interface ToppingPlacementControlProps {
  placement: ToppingPlacement;
  onChange: (newPlacement: ToppingPlacement) => void;
  disabled?: boolean;
  className?: string;
}

export function ToppingPlacementControl({ placement, onChange, disabled = false, className = "" }: ToppingPlacementControlProps) {
  const [activeTab, setActiveTab] = useState<"simple" | "quarters">(Array.isArray(placement) ? "quarters" : "simple");

  // Handle simple placement changes (whole, half)
  const handleSimplePlacement = (newPlacement: "whole" | "left" | "right") => {
    onChange(newPlacement);
    setActiveTab("simple");
  };

  // Handle quarter selection
  const handleQuarterClick = (quarter: "q1" | "q2" | "q3" | "q4") => {
    const currentQuarters = Array.isArray(placement) ? [...placement] : [];
    const qIndex = currentQuarters.indexOf(quarter);

    if (qIndex > -1) {
      // Remove quarter
      currentQuarters.splice(qIndex, 1);
    } else {
      // Add quarter
      currentQuarters.push(quarter);
    }

    // Convert to appropriate placement type
    if (currentQuarters.length === 0) {
      onChange("whole");
    } else if (currentQuarters.length === 4) {
      onChange("whole");
    } else {
      onChange(currentQuarters as Array<"q1" | "q2" | "q3" | "q4">);
    }
    setActiveTab("quarters");
  };

  // Get current quarters for display
  const selectedQuarters = Array.isArray(placement) ? placement : [];

  // Helper to check if quarter is selected
  const isQuarterSelected = (quarter: "q1" | "q2" | "q3" | "q4") => {
    return selectedQuarters.includes(quarter);
  };

  const multiplier = getPlacementMultiplier(placement);
  const displayText = getPlacementDisplayText(placement);

  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">Coverage:</span>
        <div className="text-sm font-semibold text-blue-600">
          {displayText} (×{multiplier.toFixed(2)})
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex mb-3 bg-white rounded-md p-1">
        <button
          onClick={() => setActiveTab("simple")}
          disabled={disabled}
          className={`flex-1 py-1.5 px-3 text-sm font-medium rounded transition-all ${
            activeTab === "simple" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-800"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Simple
        </button>
        <button
          onClick={() => setActiveTab("quarters")}
          disabled={disabled}
          className={`flex-1 py-1.5 px-3 text-sm font-medium rounded transition-all ${
            activeTab === "quarters" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-800"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Quarters
        </button>
      </div>

      {/* Simple Placement Controls */}
      {activeTab === "simple" && (
        <div className="space-y-2">
          <button
            onClick={() => handleSimplePlacement("whole")}
            disabled={disabled}
            className={`w-full py-2 px-3 text-sm font-medium rounded border transition-all ${
              placement === "whole"
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            🍕 Whole Pizza
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSimplePlacement("left")}
              disabled={disabled}
              className={`py-2 px-3 text-sm font-medium rounded border transition-all ${
                placement === "left"
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              ◀️ Left Half
            </button>

            <button
              onClick={() => handleSimplePlacement("right")}
              disabled={disabled}
              className={`py-2 px-3 text-sm font-medium rounded border transition-all ${
                placement === "right"
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              ▶️ Right Half
            </button>
          </div>
        </div>
      )}

      {/* Quarter Placement Controls */}
      {activeTab === "quarters" && (
        <div className="space-y-3">
          <div className="text-xs text-gray-600 text-center">Click quarters to select/deselect</div>

          {/* Visual Pizza Quarter Grid */}
          <div className="relative bg-orange-100 rounded-full w-24 h-24 mx-auto border-4 border-orange-200">
            {/* Quarter 1 (Top Left) */}
            <button
              onClick={() => handleQuarterClick("q1")}
              disabled={disabled}
              className={`absolute top-0 left-0 w-1/2 h-1/2 rounded-tl-full border-2 transition-all ${
                isQuarterSelected("q1") ? "bg-blue-600 border-blue-700 text-white" : "bg-transparent border-gray-400 hover:bg-gray-200"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
            >
              <span className="text-xs font-bold absolute top-1 left-1">1</span>
            </button>

            {/* Quarter 2 (Top Right) */}
            <button
              onClick={() => handleQuarterClick("q2")}
              disabled={disabled}
              className={`absolute top-0 right-0 w-1/2 h-1/2 rounded-tr-full border-2 transition-all ${
                isQuarterSelected("q2") ? "bg-blue-600 border-blue-700 text-white" : "bg-transparent border-gray-400 hover:bg-gray-200"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
            >
              <span className="text-xs font-bold absolute top-1 right-1">2</span>
            </button>

            {/* Quarter 3 (Bottom Left) */}
            <button
              onClick={() => handleQuarterClick("q3")}
              disabled={disabled}
              className={`absolute bottom-0 left-0 w-1/2 h-1/2 rounded-bl-full border-2 transition-all ${
                isQuarterSelected("q3") ? "bg-blue-600 border-blue-700 text-white" : "bg-transparent border-gray-400 hover:bg-gray-200"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={{ clipPath: "polygon(0 100%, 100% 100%, 0 0)" }}
            >
              <span className="text-xs font-bold absolute bottom-1 left-1">3</span>
            </button>

            {/* Quarter 4 (Bottom Right) */}
            <button
              onClick={() => handleQuarterClick("q4")}
              disabled={disabled}
              className={`absolute bottom-0 right-0 w-1/2 h-1/2 rounded-br-full border-2 transition-all ${
                isQuarterSelected("q4") ? "bg-blue-600 border-blue-700 text-white" : "bg-transparent border-gray-400 hover:bg-gray-200"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
            >
              <span className="text-xs font-bold absolute bottom-1 right-1">4</span>
            </button>
          </div>

          {/* Quarter Status */}
          <div className="text-center">
            <div className="text-xs text-gray-600">Selected: {selectedQuarters.length}/4 quarters</div>
            {selectedQuarters.length > 0 && <div className="text-xs text-blue-600 mt-1">{selectedQuarters.join(", ").toUpperCase()}</div>}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onChange("whole")}
              disabled={disabled}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded border transition-all ${
                selectedQuarters.length === 4 || placement === "whole"
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-gray-300 text-gray-700 hover:border-gray-400"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              All
            </button>

            <button
              onClick={() => onChange([])}
              disabled={disabled}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded border transition-all ${
                selectedQuarters.length === 0
                  ? "border-gray-600 bg-gray-50 text-gray-900"
                  : "border-gray-300 text-gray-700 hover:border-gray-400"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              None
            </button>
          </div>
        </div>
      )}

      {/* Pricing Impact */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-600 text-center">
          Price will be multiplied by <span className="font-semibold text-gray-800">{multiplier.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

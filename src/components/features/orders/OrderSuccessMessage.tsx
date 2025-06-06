// src/components/features/orders/OrderSuccessMessage.tsx
"use client";
import { useEffect, useState } from "react";

interface OrderSuccessMessageProps {
  orderNumber: string;
  orderTotal: number;
  orderType: "pickup" | "delivery";
  estimatedTime: number; // minutes
  onComplete: () => void; // Called when animation completes
}

export default function OrderSuccessMessage({
  orderNumber,
  orderTotal,
  orderType,
  estimatedTime,
  onComplete,
}: OrderSuccessMessageProps) {
  const [progress, setProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show details after initial animation
    const detailsTimer = setTimeout(() => {
      setShowDetails(true);
    }, 500);

    // Progress animation
    const progressTimer = setTimeout(() => {
      setProgress(100);
    }, 1000);

    // Auto-complete after 4 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(detailsTimer);
      clearTimeout(progressTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const formatTime = () => {
    if (orderType === "pickup") {
      return `Ready in ~${estimatedTime} minutes`;
    } else {
      return `Delivered in ~${estimatedTime} minutes`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header with Animation */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center text-white relative">
          <div className="absolute inset-0 bg-white opacity-20 transform -skew-y-1"></div>
          <div className="relative">
            <div className="text-6xl mb-4 animate-bounce">✅</div>
            <h2 className="text-2xl font-bold mb-2">Order Created!</h2>
            <div className="text-green-100">Order #{orderNumber}</div>
          </div>
        </div>

        {/* Order Details */}
        <div className="p-6 space-y-4">
          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-500 h-full transition-all duration-2000 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Order Summary */}
          {showDetails && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-900">Order Total:</span>
                <span className="text-xl font-bold text-green-600">
                  ${orderTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-900">Order Type:</span>
                <span className="capitalize font-medium text-gray-700 flex items-center">
                  {orderType === "pickup" ? "🏃" : "🚚"} {orderType}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-900">
                  Estimated Time:
                </span>
                <span className="font-medium text-blue-600">
                  {formatTime()}
                </span>
              </div>

              {/* Action Items */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  {orderType === "pickup"
                    ? "Pickup Instructions:"
                    : "Delivery Information:"}
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {orderType === "pickup" ? (
                    <>
                      <li>• You&apos;ll receive a notification when ready</li>
                      <li>• Please bring your order number</li>
                      <li>• Check the pickup counter display</li>
                    </>
                  ) : (
                    <>
                      <li>• Driver will contact you when nearby</li>
                      <li>• Please keep your phone accessible</li>
                      <li>• Have payment ready if paying on delivery</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Next Steps */}
              <div className="text-center pt-4">
                <div className="text-sm text-gray-600 mb-3">
                  Starting next order in a few seconds...
                </div>
                <button
                  onClick={onComplete}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Start New Order Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

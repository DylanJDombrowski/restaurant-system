// src/app/staff/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { useRouter } from "next/navigation";

/**
 * Staff PIN Login Page
 *
 * This is the main interface staff see when they open the POS system.
 * It provides a simple, touch-friendly way to log in using only a 6-digit PIN
 * on a device that's already been registered to their restaurant.
 */
export default function StaffLoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const { user, staff, loginWithPin } = useAuth();
  const router = useRouter();

  // Check terminal registration status
  useEffect(() => {
    const registeredRestaurantId = localStorage.getItem("pos_restaurant_id");
    const registeredRestaurantName = localStorage.getItem(
      "pos_restaurant_name"
    );

    if (registeredRestaurantId && registeredRestaurantName) {
      setIsRegistered(true);
      setRestaurantName(registeredRestaurantName);
    } else {
      setIsRegistered(false);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && staff) {
      router.push("/staff/orders");
    }
  }, [user, staff, router]);

  /**
   * Handle PIN Input
   *
   * This function manages the PIN entry process, including validation
   * and calling the authentication API.
   */
  const handlePinSubmit = async () => {
    if (pin.length !== 6) {
      setError("PIN must be 6 digits");
      return;
    }

    const restaurantId = localStorage.getItem("pos_restaurant_id");
    if (!restaurantId) {
      setError("Terminal not registered");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the enhanced auth context method
      await loginWithPin(pin, restaurantId);

      // Success - redirect will happen automatically via auth context
    } catch (error) {
      console.error("PIN login failed:", error);
      setError(error instanceof Error ? error.message : "Login failed");
      setPin(""); // Clear PIN on failure
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Keypad Input
   *
   * This function manages the numeric keypad interactions.
   */
  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-submit when 6 digits are entered
      if (newPin.length === 6) {
        // Small delay to show the complete PIN
        setTimeout(() => handlePinSubmit(), 100);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  // If terminal is not registered, show registration prompt
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Terminal Not Registered
          </h1>
          <p className="text-gray-600 mb-6">
            This device needs to be registered by an administrator before staff
            can log in.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/admin")}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Admin Login to Register
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Check Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main PIN login interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Restaurant Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {restaurantName}
          </h1>
          <p className="text-gray-600">Staff PIN Login</p>
        </div>

        {/* PIN Display */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Your 6-Digit PIN
            </label>
            <div className="flex justify-center space-x-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                    pin.length > index
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {pin.length > index ? "●" : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-center">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeypadPress(digit.toString())}
              disabled={loading || pin.length >= 6}
              className="h-16 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg text-xl font-bold text-gray-700 transition-colors active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            onClick={handleClear}
            disabled={loading}
            className="h-16 bg-red-100 hover:bg-red-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg text-sm font-bold text-red-700 transition-colors active:scale-95"
          >
            Clear
          </button>

          <button
            onClick={() => handleKeypadPress("0")}
            disabled={loading || pin.length >= 6}
            className="h-16 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg text-xl font-bold text-gray-700 transition-colors active:scale-95"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            disabled={loading || pin.length === 0}
            className="h-16 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg text-sm font-bold text-gray-700 transition-colors active:scale-95"
          >
            ⌫
          </button>
        </div>

        {/* Manual Submit Button (backup) */}
        <button
          onClick={handlePinSubmit}
          disabled={loading || pin.length !== 6}
          className="w-full bg-blue-600 text-white py-4 px-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Signing In...
            </span>
          ) : pin.length === 6 ? (
            "Sign In"
          ) : (
            `Enter ${6 - pin.length} more digit${
              6 - pin.length === 1 ? "" : "s"
            }`
          )}
        </button>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact your manager or admin
          </p>
          <div className="mt-2">
            <button
              onClick={() => router.push("/admin")}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

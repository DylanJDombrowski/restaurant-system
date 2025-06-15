// src/app/staff/page.tsx - ENHANCED VERSION
"use client";

import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/lib/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * ENHANCED Staff PIN Login Page
 *
 * This page now properly handles the dual authentication system
 * and provides better user experience during auth state transitions.
 */
export default function StaffLoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const { user, staff, authMethod, loginWithPin, signOut } = useAuth();
  const router = useRouter();

  // Check terminal registration status
  useEffect(() => {
    const registeredRestaurantId = localStorage.getItem("pos_restaurant_id");
    const registeredRestaurantName = localStorage.getItem("pos_restaurant_name");

    if (registeredRestaurantId && registeredRestaurantName) {
      setIsRegistered(true);
      setRestaurantName(registeredRestaurantName);
    } else {
      setIsRegistered(false);
    }
  }, []);

  // Handle redirect for already authenticated users
  useEffect(() => {
    if (user && staff && authMethod) {
      console.log(`User authenticated via ${authMethod}, redirecting...`);

      // Small delay to prevent flash
      const timer = setTimeout(() => {
        router.push("/staff/orders");
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, staff, authMethod, router]);

  /**
   * Handle PIN Input
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
      await loginWithPin(pin, restaurantId);
      // Redirect will happen automatically via useEffect above
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
   */
  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 6) {
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

  /**
   * Handle Email Login Mode
   */
  const handleSwitchToEmail = async () => {
    // Clear any existing PIN session
    localStorage.removeItem("pin_session");
    await signOut();
    setShowEmailLogin(true);
  };

  // Show loading state while auth is being determined
  if (user && staff && authMethod) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Welcome back, {staff.name}!</div>
          <div className="text-sm text-gray-900">Redirecting to orders...</div>
        </div>
      </div>
    );
  }

  // Show email login interface if requested
  if (showEmailLogin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
          <p className="text-center text-gray-900 mb-6">Use email and password for administrative access</p>
          <button
            onClick={() => router.push("/admin")}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Admin Login
          </button>
          <button
            onClick={() => setShowEmailLogin(false)}
            className="w-full mt-3 bg-gray-200 text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            ← Back to PIN Login
          </button>
        </div>
      </div>
    );
  }

  // Terminal not registered
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Terminal Not Registered</h1>
          <p className="text-gray-900 mb-6">This device needs to be registered by an administrator before staff can log in.</p>
          <div className="space-y-3">
            <button
              onClick={handleSwitchToEmail}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Admin Login to Register
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{restaurantName}</h1>
          <p className="text-gray-900">Staff PIN Login</p>
        </div>

        {/* PIN Display */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">Enter Your 6-Digit PIN</label>
            <div className="flex justify-center space-x-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                    pin.length > index ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-900"
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
              className="h-16 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-900 rounded-lg text-xl font-bold text-gray-900 transition-colors active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            onClick={handleClear}
            disabled={loading}
            className="h-16 bg-red-100 hover:bg-red-200 disabled:bg-gray-50 disabled:text-gray-900 rounded-lg text-sm font-bold text-red-700 transition-colors active:scale-95"
          >
            Clear
          </button>

          <button
            onClick={() => handleKeypadPress("0")}
            disabled={loading || pin.length >= 6}
            className="h-16 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-900 rounded-lg text-xl font-bold text-gray-900 transition-colors active:scale-95"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            disabled={loading || pin.length === 0}
            className="h-16 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-900 rounded-lg text-sm font-bold text-gray-900 transition-colors active:scale-95"
          >
            ⌫
          </button>
        </div>

        {/* Manual Submit Button */}
        <button
          onClick={handlePinSubmit}
          disabled={loading || pin.length !== 6}
          className="w-full bg-blue-600 text-white py-4 px-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-900 transition-colors mb-4"
        >
          {loading ? (
            <LoadingScreen />
          ) : pin.length === 6 ? (
            "Sign In"
          ) : (
            `Enter ${6 - pin.length} more digit${6 - pin.length === 1 ? "" : "s"}`
          )}
        </button>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-900 mb-2">Need help? Contact your manager or admin</p>
          <button onClick={handleSwitchToEmail} className="text-xs text-blue-600 hover:text-blue-800 underline">
            Admin Login (Email & Password)
          </button>
        </div>
      </div>
    </div>
  );
}

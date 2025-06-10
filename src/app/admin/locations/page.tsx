// src/app/admin/locations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { Restaurant } from "@/lib/types";
import { useRouter } from "next/navigation";

/**
 * Terminal Registration Page
 *
 * This page allows admins to permanently pair a physical device (iPad, etc.)
 * with a specific restaurant location. Once paired, the device can only be
 * used for that restaurant's operations - the cornerstone of multi-tenancy.
 */
export default function LocationsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  const { staff, signOut } = useAuth();
  const router = useRouter();

  // Load restaurants this admin can manage
  useEffect(() => {
    async function loadRestaurants() {
      try {
        setError(null);

        // For now, we'll assume staff can only manage their own restaurant
        // In a multi-chain setup, this would load all restaurants in their chain
        const response = await fetch("/api/restaurants");

        if (!response.ok) {
          throw new Error("Failed to load restaurants");
        }

        const data = await response.json();
        // For single restaurant setup, just return current restaurant
        setRestaurants([data.data]);
      } catch (error) {
        console.error("Error loading restaurants:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load restaurants"
        );
      } finally {
        setLoading(false);
      }
    }

    if (staff) {
      loadRestaurants();
    }
  }, [staff]);

  /**
   * Register Terminal for Restaurant
   *
   * This function permanently pairs this device with the selected restaurant.
   * Think of it like programming a key card - once set, this device belongs
   * to this restaurant until an admin changes it.
   */
  const registerTerminal = async (restaurant: Restaurant) => {
    try {
      setRegistering(restaurant.id);
      setError(null);

      // Store restaurant ID in localStorage
      localStorage.setItem("pos_restaurant_id", restaurant.id);
      localStorage.setItem("pos_restaurant_name", restaurant.name);
      localStorage.setItem("pos_registered_at", new Date().toISOString());
      localStorage.setItem("pos_registered_by", staff?.email || "unknown");

      // ... (audit log fetch call)

      // 3. Sign out the admin user to clear the session
      await signOut();

      // 4. Redirect to the staff PIN login page
      router.push("/staff");
    } catch (error) {
      console.error("Error registering terminal:", error);
      setError(
        error instanceof Error ? error.message : "Failed to register terminal"
      );
    } finally {
      setRegistering(null);
    }
  };

  // Check if terminal is already registered
  const currentRegistration =
    typeof window !== "undefined"
      ? localStorage.getItem("pos_restaurant_id")
      : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading restaurant locations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-lg font-semibold mb-4">
          Error Loading Locations
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Terminal Registration
        </h1>
        <p className="text-gray-600 mt-2">
          Register this device as a POS terminal for a specific restaurant
          location. Once registered, this device will only be able to access
          that restaurant&apos;s data.
        </p>
      </div>

      {/* Current Registration Status */}
      {currentRegistration && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-blue-900">
              Terminal Already Registered
            </h2>
          </div>
          <p className="text-blue-800 mb-3">
            This device is currently registered to:{" "}
            <strong>{localStorage.getItem("pos_restaurant_name")}</strong>
          </p>
          <p className="text-sm text-blue-700 mb-4">
            Registered on:{" "}
            {new Date(
              localStorage.getItem("pos_registered_at") || ""
            ).toLocaleString()}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/staff")}
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
            >
              Go to Staff Login
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to unregister this terminal? Staff will not be able to log in until it's re-registered."
                  )
                ) {
                  localStorage.removeItem("pos_restaurant_id");
                  localStorage.removeItem("pos_restaurant_name");
                  localStorage.removeItem("pos_registered_at");
                  localStorage.removeItem("pos_registered_by");
                  window.location.reload();
                }
              }}
              className="bg-red-100 text-red-700 px-4 py-2 rounded font-medium hover:bg-red-200"
            >
              Unregister Terminal
            </button>
          </div>
        </div>
      )}

      {/* Restaurant Selection */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Available Restaurant Locations
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Select the restaurant location where this device will be used
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {restaurant.name}
                  </h3>

                  {/* Restaurant Details */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Restaurant ID:</span>
                      <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                        {restaurant.id}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Slug:</span>
                      <span className="ml-2">{restaurant.slug}</span>
                    </div>
                  </div>

                  {/* Warning for re-registration */}
                  {currentRegistration &&
                    currentRegistration !== restaurant.id && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Registering this device for a different restaurant
                          will override the current registration. Staff using
                          the previous restaurant&apos;s PINs will no longer be
                          able to log in on this device.
                        </p>
                      </div>
                    )}
                </div>

                {/* Registration Button */}
                <div className="ml-6">
                  <button
                    onClick={() => registerTerminal(restaurant)}
                    disabled={registering === restaurant.id}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      currentRegistration === restaurant.id
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                    }`}
                  >
                    {registering === restaurant.id ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                        >
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
                        Registering...
                      </span>
                    ) : currentRegistration === restaurant.id ? (
                      "✅ Currently Registered"
                    ) : (
                      "📱 Set as POS Terminal"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          How Terminal Registration Works
        </h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <strong>1. Security:</strong> Each device can only access one
            restaurant&apos;s data
          </p>
          <p>
            <strong>2. Staff Access:</strong> Only staff assigned to the
            registered restaurant can log in
          </p>
          <p>
            <strong>3. Persistence:</strong> Registration survives browser
            restarts and app updates
          </p>
          <p>
            <strong>4. Admin Override:</strong> Only admins can change or remove
            registration
          </p>
        </div>
      </div>
    </div>
  );
}

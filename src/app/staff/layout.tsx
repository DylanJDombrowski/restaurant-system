// src/app/staff/layout.tsx - Protected Staff Layout
"use client";
import Link from "next/link";
import { ProtectedRoute, useAuth } from "@/lib/auth/auth-context";

/**
 * Protected Staff Layout
 *
 * This layout wraps all staff routes with authentication protection.
 * It also provides role-based navigation, showing different options
 * based on the staff member's role.
 */
function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const { staff, restaurant, signOut, isManager, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Staff Navigation with Role-Based Features */}
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/staff" className="text-xl font-bold text-blue-600">
                Pizza Mia - Staff
              </Link>
              <div className="ml-4 text-sm text-gray-800">
                {" "}
                {/* Darker text */}
                {restaurant?.name} • {staff?.name} ({staff?.role})
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Core staff features - available to all authenticated staff */}
              <Link
                href="/staff/orders"
                className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium" // Darker text
              >
                Orders
              </Link>

              {/* Manager features - only visible to managers and admins */}
              {isManager && (
                <Link
                  href="/staff/menu"
                  className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium" // Darker text
                >
                  Menu
                </Link>
              )}

              {/* Admin features - only visible to admins */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium" // Darker text
                >
                  Admin
                </Link>
              )}

              <Link
                href="/kitchen"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Kitchen Display
              </Link>

              {/* Sign out button */}
              <button
                onClick={signOut}
                className="text-gray-900 hover:text-red-600 px-3 py-2 rounded-md border border-gray-300 hover:border-red-400 font-medium" // Darker text
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Staff Content */}
      <main className="max-w-7xl mx-auto py-6 px-4">{children}</main>
    </div>
  );
}

/**
 * Staff Layout with Protection
 *
 * This is the main export that wraps the content with authentication.
 * All staff routes will require authentication and at least 'staff' role.
 */
export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireRole="staff">
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </ProtectedRoute>
  );
}

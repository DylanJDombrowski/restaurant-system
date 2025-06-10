// src/app/staff/layout.tsx - FIXED
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProtectedRoute, useAuth } from "@/lib/contexts/auth-context";

/**
 * StaffLayoutContent provides the UI for authenticated staff members,
 * including the navigation bar.
 */
function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const { staff, restaurant, signOut, isManager, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/staff" className="text-xl font-bold text-blue-600">
                Pizza Mia - Staff
              </Link>
              <div className="ml-4 text-sm text-gray-800">
                {restaurant?.name} • {staff?.name} ({staff?.role})
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/staff/orders"
                className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium"
              >
                Orders
              </Link>
              {isManager && (
                <Link
                  href="/admin/menu"
                  className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium"
                >
                  Menu
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium"
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
              <button
                onClick={signOut}
                className="text-gray-900 hover:text-red-600 px-3 py-2 rounded-md border border-gray-300 hover:border-red-400 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4">{children}</main>
    </div>
  );
}

/**
 * StaffLayout is now a conditional layout.
 * - If the user is on the /staff login page and not logged in, it renders the page directly.
 * - If the user is logged in OR on a deeper staff page, it enforces authentication.
 */
export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Show a loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If the user is on the PIN login page and is not logged in, show the login page directly
  // without the protected layout wrapper.
  if (pathname === "/staff" && !user) {
    return <>{children}</>;
  }

  // Otherwise, for all other /staff pages or if the user is already logged in,
  // apply the protected route and render the full staff layout with navigation.
  return (
    <ProtectedRoute requireRole="staff">
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </ProtectedRoute>
  );
}

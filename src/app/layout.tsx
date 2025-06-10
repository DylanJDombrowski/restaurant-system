// src/app/staff/layout.tsx - FINAL
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProtectedRoute, useAuth } from "@/lib/contexts/auth-context";

// This line forces this layout and its children to be rendered dynamically.
// This is necessary because the layout's content depends on the user's
// authentication state and the URL, which are only known at request time.
export const dynamic = "force-dynamic";

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

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If we are on the main /staff page and the user is not logged in, just render the child
  // (which is the PIN login page) without the full layout.
  if (pathname === "/staff" && !user) {
    return <>{children}</>;
  }

  // For any other staff page, or if the user is logged in, use the protected route
  // and render the full layout with the navigation bar.
  return (
    <ProtectedRoute requireRole="staff">
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </ProtectedRoute>
  );
}

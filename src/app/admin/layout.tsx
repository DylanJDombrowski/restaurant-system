"use client";

import Link from "next/link";
import { ProtectedRoute, useAuth } from "@/lib/auth/auth-context";

/**
 * Protected Admin Layout Content
 *
 * This layout is specifically for admin-only features. Notice how
 * it's structurally similar to the staff layout but with different
 * navigation options and styling to distinguish the admin area.
 */
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { staff, restaurant, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Sidebar */}
      <div className="flex">
        <aside className="w-64 min-w-64 bg-white shadow-md min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-stone-950">Admin Panel</h2>
            <div className="mt-2 text-sm text-stone-800">
              <div>{restaurant?.name}</div>
              <div className="font-medium">{staff?.name}</div>
              <div className="text-xs text-blue-600">
                {staff?.role.toUpperCase()}
              </div>
            </div>
          </div>

          <nav className="mt-6">
            <Link
              href="/admin/analytics"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              Analytics
            </Link>
            <Link
              href="/admin/menu"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              Menu Management
            </Link>
            <Link
              href="/admin/staff"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              Staff Management
            </Link>

            <div className="mt-8 border-t pt-4">
              <Link
                href="/staff"
                className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
              >
                ← Back to Staff Dashboard
              </Link>
              <button
                onClick={signOut}
                className="block w-full text-left px-6 py-3 text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

        {/* Admin Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * Admin Layout with Protection
 *
 * This layout requires 'admin' role specifically. Notice how we use
 * ProtectedRoute with requireRole="admin" to enforce admin-only access.
 * This means managers and regular staff will see an access denied message.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireRole="admin">
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ProtectedRoute>
  );
}

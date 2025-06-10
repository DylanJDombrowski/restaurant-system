// src/app/admin/layout.tsx - Updated Admin Layout with 6-digit PIN system
"use client";

import Link from "next/link";
import { ProtectedRoute, useAuth } from "@/lib/contexts/auth-context";

/**
 * Protected Admin Layout Content
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
              href="/admin"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span>Dashboard</span>
              </div>
            </Link>

            <Link
              href="/admin/analytics"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              <div className="flex items-center gap-2">
                <span>📈</span>
                <span>Analytics</span>
              </div>
            </Link>

            <Link
              href="/admin/menu"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              <div className="flex items-center gap-2">
                <span>🍕</span>
                <span>Menu Management</span>
              </div>
            </Link>

            <Link
              href="/admin/staff"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>Staff Management</span>
              </div>
              <div className="text-xs text-gray-500 ml-6 mt-1">
                Manage 6-digit PINs
              </div>
            </Link>

            {/* Enhanced Terminal Registration Section */}
            <Link
              href="/admin/locations"
              className="block px-6 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 border-l-4 border-orange-500 bg-orange-25"
            >
              <div className="flex items-center gap-2">
                <span>📱</span>
                <span>Terminal Registration</span>
              </div>
              <div className="text-xs text-orange-600 mt-1 ml-6">
                Setup POS devices for PIN login
              </div>
            </Link>

            {/* Settings Section */}
            <div className="mt-6 px-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Settings
              </div>
            </div>

            <Link
              href="/admin/settings"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              <div className="flex items-center gap-2">
                <span>⚙️</span>
                <span>Restaurant Settings</span>
              </div>
            </Link>

            <Link
              href="/admin/integrations"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              <div className="flex items-center gap-2">
                <span>🔗</span>
                <span>Integrations</span>
              </div>
            </Link>

            {/* Quick Actions */}
            <div className="mt-8 border-t pt-4">
              <div className="px-6 mb-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Quick Actions
                </div>
              </div>

              <Link
                href="/staff"
                className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
              >
                <div className="flex items-center gap-2">
                  <span>←</span>
                  <span>Staff Dashboard</span>
                </div>
              </Link>

              {/* System Status Indicator */}
              <div className="px-6 py-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600">System Online</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  6-digit PIN system active
                </div>
              </div>

              <button
                onClick={signOut}
                className="block w-full text-left px-6 py-3 text-red-600 hover:bg-red-50 border-t"
              >
                <div className="flex items-center gap-2">
                  <span>🚪</span>
                  <span>Sign Out</span>
                </div>
              </button>
            </div>
          </nav>
        </aside>

        {/* Admin Content */}
        <main className="flex-1 p-8">
          {/* Header with system status */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {getPageTitle()}
                </h1>
                <p className="text-gray-600 mt-1">
                  {restaurant?.name} Admin Panel
                </p>
              </div>

              {/* System Status Pills */}
              <div className="flex items-center gap-3">
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  🔐 PIN System Active
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  ✨ Multi-tenant Ready
                </div>
              </div>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Get page title based on current route
 */
function getPageTitle(): string {
  if (typeof window === "undefined") return "Admin Dashboard";

  const path = window.location.pathname;
  const titleMap: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/analytics": "Analytics",
    "/admin/menu": "Menu Management",
    "/admin/staff": "Staff Management",
    "/admin/locations": "Terminal Registration",
    "/admin/settings": "Restaurant Settings",
    "/admin/integrations": "Integrations",
  };

  return titleMap[path] || "Admin Dashboard";
}

/**
 * Admin Layout with Protection
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

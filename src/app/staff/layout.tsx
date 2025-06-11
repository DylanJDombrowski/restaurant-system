// src/app/staff/layout.tsx - FINAL CORRECTED VERSION
"use client";
import { ProtectedRoute, useAuth } from "@/lib/contexts/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Import 'dynamic' and rename it to 'dynamicImport'
import dynamicImport from "next/dynamic";

// This is the Next.js configuration export - it's now safe to use
export const dynamic = "force-dynamic";

// Use the renamed 'dynamicImport' function for your component
const AuthLoadingScreen = dynamicImport(() => import("@/components/ui/AuthLoadingScreen").then((mod) => mod.AuthLoadingScreen), {
  ssr: false,
});

/**
 * This component contains the actual UI for an authenticated staff member,
 * including the navigation bar and main content area.
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
              <Link href="/staff/orders" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                Orders
              </Link>
              {isManager && (
                <Link href="/admin/menu" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                  Menu
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                  Admin
                </Link>
              )}
              <Link href="/kitchen" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
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
 * StaffLayout is a conditional layout that correctly handles the public
 * PIN login page versus protected internal staff pages.
 */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Show a simple loading state while we check for an active session.
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // If the user is on the PIN login page (`/staff`) and is not logged in,
  // we render the page directly without the protected layout. This allows
  // unauthenticated users to see the PIN pad.
  if (pathname === "/staff" && !user) {
    return <>{children}</>;
  }

  // For all other /staff/* pages, or if the user is already logged in on /staff,
  // we enforce the authentication protection and render the full staff layout
  // with the navigation bar.
  return (
    <ProtectedRoute requireRole="staff">
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </ProtectedRoute>
  );
}

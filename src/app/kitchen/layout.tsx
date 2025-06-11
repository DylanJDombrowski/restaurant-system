// src/app/kitchen/layout.tsx - CORRECTED AND SECURED VERSION
"use client";

import { ProtectedRoute } from "@/lib/contexts/auth-context";
import Link from "next/link";

// This is the actual UI for the kitchen view
function KitchenLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Kitchen Header */}
      <header className="bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold">🍽️ Kitchen Display</h1>
          <p className="text-gray-400 text-sm">Pizza Mia - New Lenox</p>
        </div>
        <div className="px-6">
          <Link href="/staff" className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            ← Back to Staff POS
          </Link>
        </div>
      </header>

      {/* Kitchen Content */}
      <main className="p-6">{children}</main>
    </div>
  );
}

// This wrapper component applies the protection
export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  // Any staff member can view the kitchen screen
  return (
    <ProtectedRoute requireRole="staff">
      <KitchenLayoutContent>{children}</KitchenLayoutContent>
    </ProtectedRoute>
  );
}

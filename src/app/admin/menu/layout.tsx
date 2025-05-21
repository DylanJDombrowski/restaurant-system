// src/app/admin/menu/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { MenuContextProvider } from "@/lib/contexts/menu-context"; // Add this import

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Determine if we're in a deep item edit route
  const isItemEditRoute = pathname.includes("/admin/menu/item/");

  // Determine active tab
  const isMenuItemsTab = pathname === "/admin/menu";
  const isCategoriesTab = pathname === "/admin/menu/categories";

  return (
    // Wrap everything with the MenuContextProvider
    <MenuContextProvider>
      <div className="space-y-6">
        {/* Persistent Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-stone-950">Menu Management</h1>
          <div className="space-x-2">
            <Link
              href="/admin"
              className="bg-gray-200 text-stone-950 px-4 py-2 rounded hover:bg-gray-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Only show tab navigation on main list pages, not on item edit pages */}
        {!isItemEditRoute && (
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <Link
                href="/admin/menu"
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  isMenuItemsTab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Menu Items
              </Link>
              <Link
                href="/admin/menu/categories"
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  isCategoriesTab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Categories
              </Link>

              {/* Action Buttons */}
              <div className="ml-auto flex items-center space-x-2">
                <Link
                  href="/admin/menu/item/new"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add New Item
                </Link>
              </div>
            </nav>
          </div>
        )}

        {/* Page Content */}
        <div className="bg-white p-4 rounded-lg shadow">{children}</div>
      </div>
    </MenuContextProvider>
  );
}

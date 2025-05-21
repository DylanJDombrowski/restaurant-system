// src/app/admin/menu/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { MenuContextProvider, useMenuContext } from "./menu-context";

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("items");

  // Update active tab based on current path
  useEffect(() => {
    if (pathname === "/admin/menu") {
      setActiveTab("items");
    } else if (pathname === "/admin/menu/categories") {
      setActiveTab("categories");
    } else if (pathname.includes("/admin/menu/item")) {
      setActiveTab("items"); // Still highlight items tab when editing an item
    }
  }, [pathname]);

  return (
    <MenuContextProvider>
      <MenuLayoutContent activeTab={activeTab}>{children}</MenuLayoutContent>
    </MenuContextProvider>
  );
}

// Separate component to use the context
function MenuLayoutContent({
  children,
  activeTab,
}: {
  children: React.ReactNode;
  activeTab: string;
}) {
  const { categories, selectedCategory, setSelectedCategory, loading } =
    useMenuContext();

  return (
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

      {/* Persistent Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <Link
            href="/admin/menu"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "items"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Menu Items
          </Link>
          <Link
            href="/admin/menu/categories"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "categories"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Categories
          </Link>

          {/* Action Buttons - These stay visible and accessible */}
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

      {/* Category Filter Bar */}
      {activeTab === "items" && (
        <div className="bg-white shadow rounded-lg">
          <div className="p-4 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-stone-950">
              Filter by Category
            </h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {loading
              ? // Loading indicators for categories
                Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-10 w-28 animate-pulse bg-gray-200 rounded-lg"
                    ></div>
                  ))
              : categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg ${
                      selectedCategory === category.id
                        ? "bg-blue-600 text-white"
                        : "bg-stone-100 text-stone-800 hover:bg-stone-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
          </div>
        </div>
      )}

      {/* Page Content - Only this part changes when navigating */}
      <div className="bg-white p-4 rounded-lg shadow">{children}</div>
    </div>
  );
}

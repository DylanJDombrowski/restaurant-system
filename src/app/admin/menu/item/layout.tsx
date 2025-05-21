// Create a new file: src/app/admin/menu/item/layout.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ItemEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const itemId = params?.id as string;
  const isNewItem = itemId === "new";

  return (
    <div className="space-y-4">
      {/* Item Edit Navigation */}
      <div className="flex items-center mb-4">
        <Link
          href="/admin/menu"
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Back to Menu Items
        </Link>
        <span className="mx-2 text-gray-400">|</span>
        <h2 className="text-xl font-semibold text-stone-950">
          {isNewItem ? "Add New Item" : "Edit Item"}
        </h2>
      </div>

      {/* Only show variants tab if editing an existing item */}
      {!isNewItem && (
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-8">
            <Link
              href={`/admin/menu/item/${itemId}`}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                !params?.variant
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Basic Info
            </Link>
            <Link
              href={`/admin/menu/item/${itemId}/variants`}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                params?.variant
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Size & Variants
            </Link>
          </nav>
        </div>
      )}

      {/* Children Content */}
      {children}
    </div>
  );
}

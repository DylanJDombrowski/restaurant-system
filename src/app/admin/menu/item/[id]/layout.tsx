// src/app/admin/menu/item/[id]/layout.tsx
"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function ItemEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();

  const itemId = params?.id as string;
  const isNewItem = itemId === "new";

  // Determine which tab is active
  const isDetailsTab = !pathname.includes("/variants");
  const isVariantsTab = pathname.includes("/variants");

  if (isNewItem) {
    // No tabs needed for new items
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      {/* Item Edit Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-8">
          <Link
            href={`/admin/menu/item/${itemId}`}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              isDetailsTab
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            Basic Info
          </Link>
          <Link
            href={`/admin/menu/item/${itemId}/variants`}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              isVariantsTab
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            Size & Variants
          </Link>
        </nav>
      </div>

      {/* Children Content */}
      {children}
    </div>
  );
}

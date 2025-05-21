// src/components/ui/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    // Convert the path to breadcrumb items
    const pathSegments = pathname.split("/").filter(Boolean);

    // Create breadcrumb items from path segments
    const breadcrumbs: BreadcrumbItem[] = [];

    // Start with Home
    breadcrumbs.push({ label: "Admin", href: "/admin" });

    // Build up the rest of the path
    let currentPath = "/admin";

    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;

      // Create a label from the segment (capitalize, remove hyphens)
      let label = segment.replace(/-/g, " ");

      // Special cases for better labels
      if (segment === "menu") {
        label = "Menu";
      } else if (segment === "item") {
        // Skip "item" in the breadcrumb as it's just a route organization
        continue;
      } else if (segment === "new") {
        label = "New Item";
      } else if (segment === "variants") {
        label = "Size & Variants";
      } else if (segment === "categories") {
        label = "Categories";
      } else if (
        segment.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        )
      ) {
        // This is a UUID, try to get a better label from the page
        // For now, we'll use "Item Details"
        label = "Item Details";
      }

      breadcrumbs.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        href: currentPath,
        current: i === pathSegments.length - 1,
      });
    }

    setItems(breadcrumbs);
  }, [pathname]);

  if (items.length <= 1) return null;

  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {items.map((item, index) => (
          <li key={item.href} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-3 h-3 mx-1 text-gray-400"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 9 4-4-4-4"
                />
              </svg>
            )}
            {item.current ? (
              <span
                className="text-sm font-medium text-gray-500"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

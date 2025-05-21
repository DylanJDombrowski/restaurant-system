// src/components/ui/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Convert the path to breadcrumb items
    const pathSegments = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [];

    // Start with Home/Admin
    if (pathSegments[0] === "admin") {
      items.push({ label: "Admin", href: "/admin" });
    } else {
      items.push({ label: "Home", href: "/" });
    }

    // Build up the rest of the path
    let currentPath = `/${pathSegments[0]}`;

    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;

      // Skip adding IDs as breadcrumbs, or create a friendly label
      if (segment.match(/^[0-9a-f-]{36}$/)) {
        continue; // Skip UUID segments
      }

      // Create a label from the segment (capitalize, remove hyphens)
      let label = segment.replace(/-/g, " ");

      // Special cases for better labels
      if (segment === "menu") {
        label = "Menu Management";
      } else if (segment === "item") {
        continue; // Skip "item" in breadcrumbs
      } else if (segment === "variants") {
        label = "Variants";
      } else if (segment === "categories") {
        label = "Categories";
      } else if (segment === "new") {
        label = "New Item";
      }

      // Capitalize first letter
      label = label.charAt(0).toUpperCase() + label.slice(1);

      items.push({
        label,
        href: currentPath,
        current: i === pathSegments.length - 1,
      });
    }

    return items;
  }, [pathname]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumbs.map((item, index) => (
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

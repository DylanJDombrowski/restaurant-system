"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainRoutes = [
  { href: "/", label: "Home" },
  { href: "/staff", label: "Staff Dashboard" },
  { href: "/kitchen", label: "Kitchen Display" },
  { href: "/admin", label: "Admin Panel" },
];

export function QuickNavigation() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border">
      <p className="text-sm text-gray-600 mb-2">Quick Navigation:</p>
      <div className="space-y-1">
        {mainRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`block px-3 py-1 rounded text-sm transition ${
              pathname.startsWith(route.href) && route.href !== "/"
                ? "bg-blue-100 text-blue-700"
                : pathname === route.href
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {route.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Sidebar */}
      <div className="flex">
        <aside className="w-64 bg-white shadow-md min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
          </div>
          <nav className="mt-6">
            <Link
              href="/admin"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/restaurants"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              Restaurants
            </Link>
            <Link
              href="/admin/analytics"
              className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              Analytics
            </Link>
          </nav>
        </aside>

        {/* Admin Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Staff Navigation */}
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/staff" className="text-xl font-bold text-blue-600">
                Pizza Mia - Staff
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/staff/orders"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
              >
                Orders
              </Link>
              <Link
                href="/staff/menu"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md"
              >
                Menu
              </Link>
              <Link
                href="/kitchen"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Kitchen Display
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Staff Content */}
      <main className="max-w-7xl mx-auto py-6 px-4">{children}</main>
    </div>
  );
}

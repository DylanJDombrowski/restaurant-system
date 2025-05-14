import Link from "next/link";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Customer Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-red-600">
                🍕 Pizza Mia
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/menu"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Menu
              </Link>
              <Link
                href="/customer/order"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Order Now
              </Link>
              <Link
                href="/cart"
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Cart (0)
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Customer Content */}
      <main>{children}</main>
    </div>
  );
}

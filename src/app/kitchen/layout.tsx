export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Kitchen Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold">🍽️ Kitchen Display</h1>
          <p className="text-gray-400 text-sm">Pizza Mia - New Lenox</p>
        </div>
      </header>

      {/* Kitchen Content */}
      <main className="p-6">{children}</main>
    </div>
  );
}

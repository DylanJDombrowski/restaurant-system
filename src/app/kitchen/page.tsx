export default function KitchenDisplay() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Active Orders</h1>
        <div className="text-lg">
          <span className="bg-green-600 px-3 py-1 rounded-full">
            System Online
          </span>
        </div>
      </div>

      {/* Orders Grid - Will be populated with real orders later */}
      <div className="grid lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((order) => (
          <div
            key={order}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-yellow-400">
                Order #{order}001
              </h3>
              <span className="bg-yellow-600 px-2 py-1 rounded text-sm">
                {order === 1 ? "5 min" : order === 2 ? "8 min" : "12 min"}
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-white">1x Large Pepperoni Pizza</div>
              <div className="text-white">1x Garlic Knots</div>
              <div className="text-gray-400 text-sm">Special: Extra cheese</div>
            </div>
            <button className="w-full mt-4 bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
              Mark Complete
            </button>
          </div>
        ))}
      </div>

      {/* Shows when no orders */}
      {false && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🍕</div>
          <h2 className="text-2xl text-gray-400">No active orders</h2>
          <p className="text-gray-500 mt-2">Kitchen is caught up!</p>
        </div>
      )}
    </div>
  );
}

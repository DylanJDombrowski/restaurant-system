// src/app/admin/analytics/page.tsx
"use client";

import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { supabase } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Define proper types for our data structures
interface TimeSeriesDataPoint {
  name: string;
  orders: number;
}

interface RevenueDataPoint {
  name: string;
  revenue: number;
}

interface PopularItemData {
  name: string;
  quantity: number;
  value: number;
  fill: string;
}

interface CategoryData {
  name: string;
  value: number;
  fill: string;
}

export default function AnalyticsDashboard() {
  // State for time period selection
  const [timeRange, setTimeRange] = useState<
    "today" | "week" | "month" | "year"
  >("week");

  // State for various metrics with proper typing
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<TimeSeriesDataPoint[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [topItems, setTopItems] = useState<PopularItemData[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<
    CategoryData[]
  >([]);
  const [orderMetrics, setOrderMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    completionRate: 0,
  });

  // Colors for charts
  const COLORS = useMemo(
    () => ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"],
    []
  );

  // Fetch and process top selling items with useCallback
  const fetchTopSellingItems = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        // First get order IDs in the date range
        const { data: orders } = await supabase
          .from("orders")
          .select("id")
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        if (!orders || orders.length === 0) {
          setTopItems([]);
          return;
        }

        const orderIds = orders.map((order) => order.id);

        // Then get order items for those orders
        const { data: orderItems } = await supabase
          .from("order_items")
          .select(
            `
          menu_item_id,
          quantity,
          menu_items(name)
        `
          )
          .in("order_id", orderIds);

        if (!orderItems || orderItems.length === 0) {
          setTopItems([]);
          return;
        }

        // Count items and quantities
        const itemCounts: Record<
          string,
          { name: string; count: number; quantity: number }
        > = {};

        orderItems.forEach((item) => {
          const itemId = item.menu_item_id;
          // Use type assertion to handle the menu_items property
          const menuItemData = item.menu_items as { name?: string } | null;
          const itemName = menuItemData?.name || "Unknown Item";
          const quantity = item.quantity || 1;

          if (!itemCounts[itemId]) {
            itemCounts[itemId] = { name: itemName, count: 0, quantity: 0 };
          }

          itemCounts[itemId].count += 1;
          itemCounts[itemId].quantity += quantity;
        });

        // Convert to array and sort
        const sortedItems = Object.values(itemCounts)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10)
          .map((item, index) => ({
            name: item.name,
            quantity: item.quantity,
            value: item.quantity, // For pie chart compatibility
            fill: COLORS[index % COLORS.length],
          }));

        setTopItems(sortedItems);
      } catch (error) {
        console.error("Error fetching top items:", error);
        setTopItems([]);
      }
    },
    [COLORS]
  );

  // Fetch and process category distribution with useCallback
  const fetchCategoryDistribution = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        // This query is more complex, requiring multiple joins
        // First get order IDs in the date range
        const { data: orders } = await supabase
          .from("orders")
          .select("id")
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        if (!orders || orders.length === 0) {
          setCategoryDistribution([]);
          return;
        }

        const orderIds = orders.map((order) => order.id);

        // Then get menu items joined with categories
        const { data: orderItems } = await supabase
          .from("order_items")
          .select(
            `
          quantity,
          menu_items(
            category_id,
            menu_categories(name)
          )
        `
          )
          .in("order_id", orderIds);

        if (!orderItems || orderItems.length === 0) {
          setCategoryDistribution([]);
          return;
        }

        // Count items by category
        const categoryCounts: Record<string, { name: string; count: number }> =
          {};

        orderItems.forEach((item) => {
          // Fix type handling for nested data
          const menuItem = item.menu_items as {
            category_id?: string;
            menu_categories?: { name?: string };
          } | null;

          const categoryId = menuItem?.category_id;
          const categoryName =
            menuItem?.menu_categories?.name || "Uncategorized";
          const quantity = item.quantity || 1;

          if (!categoryId) return;

          if (!categoryCounts[categoryId]) {
            categoryCounts[categoryId] = { name: categoryName, count: 0 };
          }

          categoryCounts[categoryId].count += quantity;
        });

        // Convert to array and sort
        const sortedCategories = Object.values(categoryCounts)
          .sort((a, b) => b.count - a.count)
          .map((category, index) => ({
            name: category.name,
            value: category.count,
            fill: COLORS[index % COLORS.length],
          }));

        setCategoryDistribution(sortedCategories);
      } catch (error) {
        console.error("Error fetching category distribution:", error);
        setCategoryDistribution([]);
      }
    },
    [COLORS]
  );

  // Process time series data based on time range with proper typing
  function processTimeSeriesData(
    orders: Array<{ created_at: string; total: number; status: string }>,
    startDate: Date,
    endDate: Date,
    timeRange: string
  ): { orderCounts: TimeSeriesDataPoint[]; revenueTotals: RevenueDataPoint[] } {
    const orderCounts: TimeSeriesDataPoint[] = [];
    const revenueTotals: RevenueDataPoint[] = [];

    if (!orders || orders.length === 0) {
      return { orderCounts, revenueTotals };
    }

    // Group data differently depending on time range
    if (timeRange === "today") {
      // Group by hour for today
      const hourData: Record<number, { orders: number; revenue: number }> = {};

      // Initialize all hours
      for (let i = 0; i < 24; i++) {
        hourData[i] = { orders: 0, revenue: 0 };
      }

      // Aggregate data
      orders.forEach((order) => {
        const date = new Date(order.created_at);
        const hour = date.getHours();
        hourData[hour].orders += 1;
        hourData[hour].revenue += order.total || 0;
      });

      // Convert to arrays
      for (let i = 0; i < 24; i++) {
        const hourLabel = `${i}:00`;
        orderCounts.push({ name: hourLabel, orders: hourData[i].orders });
        revenueTotals.push({ name: hourLabel, revenue: hourData[i].revenue });
      }
    } else if (timeRange === "week") {
      // Group by day for week
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayData: Record<number, { orders: number; revenue: number }> = {};

      // Initialize all days
      for (let i = 0; i < 7; i++) {
        dayData[i] = { orders: 0, revenue: 0 };
      }

      // Aggregate data
      orders.forEach((order) => {
        const date = new Date(order.created_at);
        const day = date.getDay();
        dayData[day].orders += 1;
        dayData[day].revenue += order.total || 0;
      });

      // Convert to arrays
      for (let i = 0; i < 7; i++) {
        orderCounts.push({
          name: dayNames[i].substring(0, 3),
          orders: dayData[i].orders,
        });
        revenueTotals.push({
          name: dayNames[i].substring(0, 3),
          revenue: dayData[i].revenue,
        });
      }
    } else if (timeRange === "month") {
      // Group by day for month
      const dayData: Record<number, { orders: number; revenue: number }> = {};

      // Calculate number of days in the range
      const days = Math.min(
        31,
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      // Initialize all days
      for (let i = 1; i <= days; i++) {
        dayData[i] = { orders: 0, revenue: 0 };
      }

      // Aggregate data
      orders.forEach((order) => {
        const date = new Date(order.created_at);
        const day = date.getDate();
        if (dayData[day]) {
          dayData[day].orders += 1;
          dayData[day].revenue += order.total || 0;
        }
      });

      // Convert to arrays
      for (let i = 1; i <= days; i++) {
        orderCounts.push({ name: `Day ${i}`, orders: dayData[i].orders });
        revenueTotals.push({ name: `Day ${i}`, revenue: dayData[i].revenue });
      }
    } else if (timeRange === "year") {
      // Group by month for year
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthData: Record<number, { orders: number; revenue: number }> = {};

      // Initialize all months
      for (let i = 0; i < 12; i++) {
        monthData[i] = { orders: 0, revenue: 0 };
      }

      // Aggregate data
      orders.forEach((order) => {
        const date = new Date(order.created_at);
        const month = date.getMonth();
        monthData[month].orders += 1;
        monthData[month].revenue += order.total || 0;
      });

      // Convert to arrays
      for (let i = 0; i < 12; i++) {
        orderCounts.push({ name: monthNames[i], orders: monthData[i].orders });
        revenueTotals.push({
          name: monthNames[i],
          revenue: monthData[i].revenue,
        });
      }
    }

    return { orderCounts, revenueTotals };
  }

  // Fetch data based on selected time period
  useEffect(() => {
    async function fetchAnalyticsData() {
      setIsLoading(true);
      try {
        // Calculate date range based on selected time period
        const endDate = new Date();
        const startDate = new Date();

        switch (timeRange) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }

        const startDateString = startDate.toISOString();
        const endDateString = endDate.toISOString();

        // Fetch orders within date range
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .gte("created_at", startDateString)
          .lte("created_at", endDateString)
          .order("created_at", { ascending: true });

        if (ordersError) throw ordersError;

        // Process order data for time series charts
        const processedOrderData = processTimeSeriesData(
          orders || [],
          startDate,
          endDate,
          timeRange
        );
        setOrderData(processedOrderData.orderCounts);
        setRevenueData(processedOrderData.revenueTotals);

        // Calculate order metrics
        const totalOrders = orders?.length || 0;
        const totalRevenue =
          orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
        const averageOrderValue =
          totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const completedOrders =
          orders?.filter((order) =>
            ["completed", "ready"].includes(order.status)
          ).length || 0;
        const completionRate =
          totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

        setOrderMetrics({
          totalOrders,
          totalRevenue,
          averageOrderValue,
          completionRate,
        });

        // Fetch order items to identify top selling items
        await fetchTopSellingItems(startDateString, endDateString);

        // Fetch category distribution
        await fetchCategoryDistribution(startDateString, endDateString);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalyticsData();
  }, [timeRange, fetchTopSellingItems, fetchCategoryDistribution]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-stone-950">
          Analytics Dashboard
        </h1>
        <div className="space-x-2">
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(
                e.target.value as "today" | "week" | "month" | "year"
              )
            }
            className="px-4 py-2 rounded-md border border-stone-300 text-stone-950"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Orders"
              value={orderMetrics.totalOrders}
              format="number"
              icon="📦"
              color="blue"
            />
            <MetricCard
              title="Total Revenue"
              value={orderMetrics.totalRevenue}
              format="currency"
              icon="💰"
              color="green"
            />
            <MetricCard
              title="Average Order"
              value={orderMetrics.averageOrderValue}
              format="currency"
              icon="🧾"
              color="yellow"
            />
            <MetricCard
              title="Completion Rate"
              value={orderMetrics.completionRate}
              format="percentage"
              icon="✅"
              color="purple"
            />
          </div>

          {/* Order and Revenue Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Order Volume">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={orderData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue Trend">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={revenueData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => {
                      if (typeof value === "number") {
                        return [`$${value.toFixed(2)}`, "Revenue"];
                      }
                      return [value, "Revenue"];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Popular Items and Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Popular Items">
              {topItems.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topItems}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#8884d8">
                      {topItems.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-stone-950">
                  No order data available
                </div>
              )}
            </ChartCard>

            <ChartCard title="Order Distribution by Category">
              {categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Orders"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-stone-950">
                  No category data available
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

// Metric Card Component - remains the same
interface MetricCardProps {
  title: string;
  value: number;
  format: "number" | "currency" | "percentage";
  icon: string;
  color: "blue" | "green" | "yellow" | "purple" | "red";
}

function MetricCard({ title, value, format, icon, color }: MetricCardProps) {
  // Format the value based on format type
  const formattedValue =
    format === "currency"
      ? `$${value.toFixed(2)}`
      : format === "percentage"
      ? `${value.toFixed(1)}%`
      : value.toString();

  // Determine color classes
  const colorClasses = {
    blue: "bg-blue-50 border-blue-500 text-blue-700",
    green: "bg-green-50 border-green-500 text-green-700",
    yellow: "bg-yellow-50 border-yellow-500 text-yellow-700",
    purple: "bg-purple-50 border-purple-500 text-purple-700",
    red: "bg-red-50 border-red-500 text-red-700",
  };

  return (
    <div className={`${colorClasses[color]} p-6 rounded-lg border-l-4 shadow`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-stone-950">{title}</h3>
          <p className="text-3xl font-bold mt-2 text-stone-950">
            {formattedValue}
          </p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

// Chart Card Component - remains the same
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-stone-200">
      <h3 className="text-lg font-medium mb-4 text-stone-950">{title}</h3>
      {children}
    </div>
  );
}

"use client";

import { supabase } from "@/src/lib/supabase/client";
import { useEffect, useState } from "react";

type StateType = {
  id: number;
  name: string;
  created_at: string;
  // Add other fields as needed based on your "restaurants" table
};

export default function Home() {
  const [restaurant, setRestaurant] = useState<StateType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRestaurant() {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .single();

      if (error) {
        console.error("Error:", error);
      } else {
        setRestaurant(data);
      }
      setLoading(false);
    }

    fetchRestaurant();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">
        Welcome to {restaurant?.name || "Your Restaurant"}
      </h1>
      <p className="mt-4">Restaurant ID: {restaurant?.id}</p>
      <p className="text-sm text-gray-600">
        Created:{" "}
        {restaurant?.created_at
          ? new Date(restaurant.created_at).toLocaleDateString()
          : "N/A"}
      </p>
    </div>
  );
}

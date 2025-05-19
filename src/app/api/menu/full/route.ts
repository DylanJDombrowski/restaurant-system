// src/app/api/menu/full/route.ts - Fixed Menu API Route
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  ApiResponse,
  MenuCategory,
  MenuItemWithVariants,
  Topping,
  Modifier,
} from "@/lib/types";

/**
 * Complete Menu Data API
 *
 * This endpoint provides all menu data needed for the customer interface,
 * including categories, items with variants, toppings, and modifiers.
 */

interface FullMenuResponse {
  categories: MenuCategory[];
  menu_items: MenuItemWithVariants[];
  toppings: Topping[];
  modifiers: Modifier[];
  restaurant_config: {
    allows_custom_pizzas: boolean;
    default_pizza_sizes: string[];
    default_crust_types: string[];
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<FullMenuResponse>>> {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    console.log("Fetching complete menu for restaurant:", restaurantId);

    // Step 1: Fetch all menu categories
    const { data: categories, error: categoriesError } = await supabaseServer
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort_order");

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      return NextResponse.json(
        { error: `Failed to fetch categories: ${categoriesError.message}` },
        { status: 500 }
      );
    }

    // Step 2: Fetch all menu items with their variants
    const { data: menuItemsRaw, error: itemsError } = await supabaseServer
      .from("menu_items")
      .select(
        `
        *,
        variants:menu_item_variants(*)
      `
      )
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("name");

    if (itemsError) {
      console.error("Error fetching menu items:", itemsError);
      return NextResponse.json(
        { error: `Failed to fetch menu items: ${itemsError.message}` },
        { status: 500 }
      );
    }

    // Step 3: Fetch all available toppings
    const { data: toppings, error: toppingsError } = await supabaseServer
      .from("toppings")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (toppingsError) {
      console.error("Error fetching toppings:", toppingsError);
      return NextResponse.json(
        { error: `Failed to fetch toppings: ${toppingsError.message}` },
        { status: 500 }
      );
    }

    // Step 4: Fetch all available modifiers
    const { data: modifiers, error: modifiersError } = await supabaseServer
      .from("modifiers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("name");

    if (modifiersError) {
      console.error("Error fetching modifiers:", modifiersError);
      return NextResponse.json(
        { error: `Failed to fetch modifiers: ${modifiersError.message}` },
        { status: 500 }
      );
    }

    // Step 5: Process and enhance menu items
    const menuItems: MenuItemWithVariants[] = await Promise.all(
      menuItemsRaw.map(async (item) => {
        // Find the category for this item
        const category = categories?.find((cat) => cat.id === item.category_id);

        // Convert the raw item to our enhanced type
        const enhancedItem: MenuItemWithVariants = {
          // All the base MenuItem properties
          id: item.id,
          restaurant_id: item.restaurant_id,
          category_id: item.category_id,
          name: item.name,
          description: item.description,
          base_price: item.base_price,
          prep_time_minutes: item.prep_time_minutes,
          is_available: item.is_available,
          item_type: item.item_type,
          allows_custom_toppings: item.allows_custom_toppings,
          default_toppings_json: item.default_toppings_json,
          image_url: item.image_url,
          created_at: item.created_at,
          updated_at: item.updated_at,

          // Enhanced properties
          category: category,
          variants: item.variants || [],
        };

        return enhancedItem;
      })
    );

    // Step 6: Build restaurant configuration
    const restaurantConfig = {
      allows_custom_pizzas: menuItems.some(
        (item) => item.item_type === "pizza" && item.allows_custom_toppings
      ),
      default_pizza_sizes: getDefaultPizzaSizes(menuItems),
      default_crust_types: getDefaultCrustTypes(menuItems),
    };

    const response: FullMenuResponse = {
      categories: categories || [],
      menu_items: menuItems,
      toppings: toppings || [],
      modifiers: modifiers || [],
      restaurant_config: restaurantConfig,
    };

    console.log(`Successfully loaded complete menu:
      - Categories: ${categories?.length || 0}
      - Menu Items: ${menuItems.length}
      - Toppings: ${toppings?.length || 0}
      - Modifiers: ${modifiers?.length || 0}
    `);

    return NextResponse.json({
      data: response,
      message: "Complete menu loaded successfully",
    });
  } catch (error) {
    console.error("Unexpected error in menu/full API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper Functions
 */

// Extract default pizza sizes from menu items
function getDefaultPizzaSizes(menuItems: MenuItemWithVariants[]): string[] {
  const pizzaItems = menuItems.filter((item) => item.item_type === "pizza");
  const sizes = new Set<string>();

  pizzaItems.forEach((item) => {
    item.variants.forEach((variant) => {
      // Assuming variant names contain size information
      if (variant.name.toLowerCase().includes("small")) sizes.add("Small");
      if (variant.name.toLowerCase().includes("medium")) sizes.add("Medium");
      if (variant.name.toLowerCase().includes("large")) sizes.add("Large");
      if (variant.name.toLowerCase().includes("extra large"))
        sizes.add("Extra Large");
    });
  });

  return Array.from(sizes);
}

// Extract default crust types from menu items
function getDefaultCrustTypes(menuItems: MenuItemWithVariants[]): string[] {
  const pizzaItems = menuItems.filter((item) => item.item_type === "pizza");
  const crustTypes = new Set<string>();

  pizzaItems.forEach((item) => {
    item.variants.forEach((variant) => {
      if (variant.crust_type) {
        crustTypes.add(variant.crust_type);
      }
    });
  });

  return Array.from(crustTypes);
}

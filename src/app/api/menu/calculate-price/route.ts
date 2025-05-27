import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/types";

// Proper types for request body
interface ToppingSelection {
  id: string;
  amount: "light" | "normal" | "extra" | "xxtra";
}

interface PriceCalculationRequest {
  variantId: string;
  toppingSelections?: ToppingSelection[];
  modifierIds?: string[];
}

// Database response types
interface VariantWithMenuItem {
  id: string;
  name: string;
  price: number;
  size_code: string;
  crust_type?: string;
  menu_items: {
    name: string;
    restaurant_id: string;
  };
}

interface CustomizationFromDB {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  base_price: number;
  price_type: "fixed" | "multiplied" | "tiered";
  pricing_rules: {
    size_multipliers?: Record<string, number>;
    tier_multipliers?: Record<string, number>;
    variant_base_prices?: Record<string, number>;
  };
  applies_to: string[];
  sort_order: number;
  is_available: boolean;
  description?: string;
}

// Response types
interface PriceBreakdownItem {
  name: string;
  price: number;
  amount?: string;
}

interface PriceCalculationResponse {
  basePrice: number;
  baseName: string;
  toppingCost: number;
  modifierCost: number;
  finalPrice: number;
  breakdown: {
    base: PriceBreakdownItem;
    toppings: PriceBreakdownItem[];
    modifiers: PriceBreakdownItem[];
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PriceCalculationResponse>>> {
  try {
    const body: PriceCalculationRequest = await request.json();
    const { variantId, toppingSelections = [], modifierIds = [] } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: "variantId is required" },
        { status: 400 }
      );
    }

    // Step 1: Get the base price for the selected variant
    const { data: variantData, error: variantError } = await supabaseServer
      .from("menu_item_variants")
      .select(
        `
        id, 
        name, 
        price,
        size_code,
        crust_type,
        menu_items!inner(name, restaurant_id)
      `
      )
      .eq("id", variantId)
      .single();

    if (variantError || !variantData) {
      console.error("Variant query error:", variantError);
      return NextResponse.json(
        { error: "Invalid variant ID" },
        { status: 400 }
      );
    }

    // Map menu_items to match VariantWithMenuItem type
    const variant: VariantWithMenuItem = {
      ...variantData,
      menu_items: Array.isArray(variantData.menu_items)
        ? variantData.menu_items[0]
        : variantData.menu_items,
    };
    const menuItem = variant.menu_items;

    if (!menuItem) {
      return NextResponse.json(
        { error: "Menu item not found for variant" },
        { status: 400 }
      );
    }

    // Step 2: Calculate topping costs using new customizations table
    let toppingCost = 0;
    const toppingBreakdown: PriceBreakdownItem[] = [];

    if (toppingSelections.length > 0) {
      const toppingIds = toppingSelections.map((t) => t.id);

      const { data: customizations, error: customizationsError } =
        await supabaseServer
          .from("customizations")
          .select("*")
          .eq("restaurant_id", menuItem.restaurant_id)
          .in("id", toppingIds)
          .like("category", "topping_%");

      if (customizationsError) {
        console.error(
          "Error loading topping customizations:",
          customizationsError
        );
        return NextResponse.json(
          { error: customizationsError.message },
          { status: 500 }
        );
      }

      // Calculate prices using mathematical formulas
      toppingSelections.forEach((selection) => {
        const customization = (customizations as CustomizationFromDB[])?.find(
          (c) => c.id === selection.id
        );
        if (customization) {
          const calculatedPrice = calculateToppingPrice(
            customization,
            variant.size_code || "medium",
            selection.amount || "normal"
          );

          toppingCost += calculatedPrice;
          toppingBreakdown.push({
            name: customization.name,
            price: calculatedPrice,
            amount: selection.amount || "normal",
          });
        }
      });
    }

    // Step 3: Calculate modifier costs using new customizations table
    let modifierCost = 0;
    const modifierBreakdown: PriceBreakdownItem[] = [];

    if (modifierIds.length > 0) {
      const { data: customizations, error: customizationsError } =
        await supabaseServer
          .from("customizations")
          .select("*")
          .eq("restaurant_id", menuItem.restaurant_id)
          .in("id", modifierIds)
          .neq("category", "topping_%");

      if (customizationsError) {
        console.error(
          "Error loading modifier customizations:",
          customizationsError
        );
        return NextResponse.json(
          { error: customizationsError.message },
          { status: 500 }
        );
      }

      (customizations as CustomizationFromDB[])?.forEach((customization) => {
        const calculatedPrice = calculateModifierPrice(customization, variant);
        modifierCost += calculatedPrice;
        modifierBreakdown.push({
          name: customization.name,
          price: calculatedPrice,
        });
      });
    }

    // Step 4: Calculate final price and return detailed breakdown
    const finalPrice = variant.price + toppingCost + modifierCost;

    return NextResponse.json({
      data: {
        basePrice: variant.price,
        baseName: `${menuItem.name} - ${variant.name}`,
        toppingCost,
        modifierCost,
        finalPrice,
        breakdown: {
          base: {
            name: `${menuItem.name} - ${variant.name}`,
            price: variant.price,
          },
          toppings: toppingBreakdown,
          modifiers: modifierBreakdown,
        },
      },
      message: "Price calculated successfully",
    });
  } catch (error) {
    console.error("Error calculating price:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ==================================================
// 3. PRICING CALCULATION FUNCTIONS - Type Safe
// ==================================================

function calculateToppingPrice(
  customization: CustomizationFromDB,
  sizeCode: string,
  amount: string
): number {
  const basePrice = customization.base_price;
  const pricingRules = customization.pricing_rules;

  // Get size multiplier
  const sizeMultiplier = pricingRules?.size_multipliers?.[sizeCode] || 1.0;

  // Get tier multiplier
  const tierMultiplier = pricingRules?.tier_multipliers?.[amount] || 1.0;

  return Math.round(basePrice * sizeMultiplier * tierMultiplier * 100) / 100;
}

function calculateModifierPrice(
  customization: CustomizationFromDB,
  variant: VariantWithMenuItem
): number {
  const pricingType = customization.price_type;
  const basePrice = customization.base_price;
  const pricingRules = customization.pricing_rules;

  switch (pricingType) {
    case "fixed":
      return basePrice;

    case "tiered":
      // For chicken white meat upgrades
      const variantBasePrice =
        pricingRules?.variant_base_prices?.[variant.size_code];
      return variantBasePrice || basePrice;

    default:
      return basePrice;
  }
}

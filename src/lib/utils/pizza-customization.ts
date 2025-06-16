// src/lib/utils/pizza-customization.ts - COMPLETELY FIXED (NO ANY TYPES)

import { Customization, MenuItemVariant } from "@/lib/types";
import { ConfiguredModifier } from "@/lib/types/cart";
import {
  PizzaCustomizationResult,
  PizzaCustomizationsByCategory,
  PizzaToppingSelection,
  PizzaValidationResult,
} from "@/lib/types/pizza";

export function usePizzaCustomization(
  variant: MenuItemVariant,
  allCustomizations: Customization[],
  restaurantId: string,
  menuItemId: string
): PizzaCustomizationResult {
  // Filter customizations for pizza items
  const availableCustomizations: PizzaCustomizationsByCategory = {
    toppings: allCustomizations.filter(
      (c) => c.category.startsWith("topping_") && c.applies_to.includes("pizza")
    ),
    sauces: allCustomizations.filter(
      (c) => c.category === "topping_sauce" && c.applies_to.includes("pizza")
    ),
    preparation: allCustomizations.filter(
      (c) => c.category === "preparation" && c.applies_to.includes("pizza")
    ),
  };

  // Template defaults would be loaded from pizza templates
  const templateDefaults = new Map<string, { amount: string; tier: string }>();

  // Get default selections for pizza
  const defaultSelections: ConfiguredModifier[] = getPizzaDefaultSelections(
    variant,
    availableCustomizations
  );

  // Pizza price calculation - FIXED: No any types
  const calculatePrice = async (
    selectedToppings: PizzaToppingSelection[]
  ): Promise<number> => {
    if (variant.crust_type === "stuffed") {
      return Promise.resolve(variant.price);
    }

    try {
      const response = await fetch("/api/menu/pizza/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          menu_item_id: menuItemId,
          size_code: variant.size_code,
          crust_type: variant.crust_type || "thin",
          toppings: selectedToppings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate pizza price");
      }

      const result = await response.json();
      return result.data?.finalPrice || variant.price;
    } catch (error) {
      console.error("Error calculating pizza price:", error);
      return variant.price;
    }
  };

  // Pizza validation - FIXED: Strict typing
  const validate = (
    selectedToppings: PizzaToppingSelection[]
  ): PizzaValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic pizza validation logic
    if (selectedToppings.length === 0) {
      warnings.push("Consider adding some toppings");
    }

    // Check for sauce selection
    const hasSauce = selectedToppings.some((topping) => {
      const customization = availableCustomizations.sauces.find(
        (s) => s.id === topping.customization_id
      );
      return customization !== undefined;
    });

    if (!hasSauce) {
      warnings.push("Consider selecting a sauce");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  return {
    availableCustomizations,
    templateDefaults,
    defaultSelections,
    calculatePrice,
    validate,
  };
}

function getPizzaDefaultSelections(
  variant: MenuItemVariant,
  availableCustomizations: PizzaCustomizationsByCategory
): ConfiguredModifier[] {
  const defaults: ConfiguredModifier[] = [];

  // Default sauce for regular pizzas
  const defaultSauce = availableCustomizations.sauces.find(
    (s) =>
      s.name.toLowerCase().includes("marinara") ||
      s.name.toLowerCase().includes("red")
  );

  if (defaultSauce) {
    defaults.push({
      id: defaultSauce.id,
      name: defaultSauce.name,
      priceAdjustment: defaultSauce.base_price,
    });
  }

  return defaults;
}

// Legacy export for backwards compatibility
export { usePizzaCustomization as useVariantModifierSystem };

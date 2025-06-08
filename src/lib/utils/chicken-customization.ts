// src/lib/utils/chicken-customization.ts - QUICK FIX VERSION
import { ChickenVariant, Customization, MenuItemVariant } from "@/lib/types";
import { ConfiguredModifier } from "@/lib/types/cart";
import {
  ChickenCustomizationResult,
  ChickenCustomizationsByCategory,
  ChickenValidationResult,
  WhiteMeatTier,
  getWhiteMeatUpcharge,
} from "@/lib/types/chicken";

export function useChickenCustomization(
  variant: MenuItemVariant,
  allCustomizations: Customization[],
  restaurantId: string
): ChickenCustomizationResult {
  // Filter customizations by category for chicken items
  const availableCustomizations: ChickenCustomizationsByCategory = {
    sides: allCustomizations.filter((c) => c.category === "sides" && c.applies_to.includes("chicken")),
    preparation: allCustomizations.filter((c) => c.category === "preparation" && c.applies_to.includes("chicken")),
    condiments: allCustomizations.filter((c) => c.category === "condiments" && c.applies_to.includes("chicken")),
  };

  // Get white meat upcharge safely - with better fallback
  const whiteMeatUpcharge = getWhiteMeatUpcharge(variant as ChickenVariant);

  // Build white meat tiers with actual calculated prices
  const whiteMeatTiers: WhiteMeatTier[] = [
    {
      id: "none",
      name: "All Dark Meat",
      level: "none",
      multiplier: 0,
      price: 0,
    },
    {
      id: "normal",
      name: `White Meat (+$${whiteMeatUpcharge.toFixed(2)})`,
      level: "normal",
      multiplier: 1,
      price: whiteMeatUpcharge,
    },
    {
      id: "extra",
      name: `Extra White Meat (+$${(whiteMeatUpcharge * 2).toFixed(2)})`,
      level: "extra",
      multiplier: 2,
      price: whiteMeatUpcharge * 2,
    },
    {
      id: "xxtra",
      name: `XXtra White Meat (+$${(whiteMeatUpcharge * 3).toFixed(2)})`,
      level: "xxtra",
      multiplier: 3,
      price: whiteMeatUpcharge * 3,
    },
  ];

  // Get default selections based on variant type
  const defaultSelections: ConfiguredModifier[] = getDefaultSelectionsForVariant(variant, availableCustomizations);

  // FIXED: Use fallback pricing calculation until API is deployed
  const calculatePrice = async (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]): Promise<number> => {
    try {
      // Try the new API first
      const response = await fetch("/api/menu/chicken/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          variant_id: variant.id,
          white_meat_tier: whiteMeatTier?.level || "none",
          customization_ids: selectedCustomizations,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data?.final_price || calculateFallbackPrice(variant, whiteMeatTier, selectedCustomizations, availableCustomizations);
      } else {
        throw new Error("API not available");
      }
    } catch (error) {
      console.warn("Chicken pricing API not available, using fallback calculation:", error);
      return calculateFallbackPrice(variant, whiteMeatTier, selectedCustomizations, availableCustomizations);
    }
  };

  // Validation function with strict typing
  const validate = (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]): ChickenValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for sides in family packs
    const sizeCode = variant.size_code;
    if (sizeCode?.includes("fam")) {
      const hasSides = selectedCustomizations.some((id) =>
        availableCustomizations.sides.find((s) => s.id === id && s.name.includes("Included"))
      );

      if (!hasSides) {
        warnings.push("Family packs include sides at no extra charge");
      }
    }

    // Check preparation selection
    const hasPreparation = selectedCustomizations.some((id) => availableCustomizations.preparation.find((p) => p.id === id));

    if (!hasPreparation) {
      warnings.push("Consider selecting a preparation style");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  return {
    availableCustomizations,
    whiteMeatTiers,
    defaultSelections,
    calculatePrice,
    validate,
  };
}

// FALLBACK PRICING CALCULATION
function calculateFallbackPrice(
  variant: MenuItemVariant,
  whiteMeatTier: WhiteMeatTier | null,
  selectedCustomizations: string[],
  availableCustomizations: ChickenCustomizationsByCategory
): number {
  let totalPrice = variant.price;

  // Add white meat cost
  if (whiteMeatTier && whiteMeatTier.price > 0) {
    totalPrice += whiteMeatTier.price;
  }

  // Add customization costs
  const allCustomizations = [
    ...availableCustomizations.sides,
    ...availableCustomizations.preparation,
    ...availableCustomizations.condiments,
  ];

  selectedCustomizations.forEach((id) => {
    const customization = allCustomizations.find((c) => c.id === id);
    if (customization) {
      totalPrice += customization.base_price;
    }
  });

  return totalPrice;
}

function getDefaultSelectionsForVariant(
  variant: MenuItemVariant,
  availableCustomizations: ChickenCustomizationsByCategory
): ConfiguredModifier[] {
  const defaults: ConfiguredModifier[] = [];
  const sizeCode = variant.size_code;

  // Family packs get default sides
  if (sizeCode?.includes("fam")) {
    // Find included sides for family packs
    const familySides = ["Coleslaw (Included)", "Broasted Potatoes (Included)", "Garlic Bread (Included)"];

    familySides.forEach((sideName) => {
      const side = availableCustomizations.sides.find((s) => s.name === sideName);
      if (side) {
        defaults.push({
          id: side.id,
          name: side.name,
          priceAdjustment: side.base_price,
        });
      }
    });
  } else {
    // Regular chicken gets default broasted potatoes
    const defaultSide = availableCustomizations.sides.find((s) => s.name === "Broasted Potatoes (8 PC Default)");
    if (defaultSide) {
      defaults.push({
        id: defaultSide.id,
        name: defaultSide.name,
        priceAdjustment: defaultSide.base_price,
      });
    }
  }

  // Default preparation: Regular Cooking
  const regularCooking = availableCustomizations.preparation.find((p) => p.name === "Regular Cooking");
  if (regularCooking) {
    defaults.push({
      id: regularCooking.id,
      name: regularCooking.name,
      priceAdjustment: regularCooking.base_price,
    });
  }

  return defaults;
}

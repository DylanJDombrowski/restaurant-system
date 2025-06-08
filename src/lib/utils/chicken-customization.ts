// src/lib/utils/chicken-customization.ts - FIXED CATEGORIES AND LOGIC
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
  console.log("🐔 useChickenCustomization called with:", {
    variantName: variant.name,
    sizeCode: variant.size_code,
    customizationCount: allCustomizations.length,
  });

  // ==========================================
  // VARIANT-AWARE FILTERING
  // ==========================================

  const sizeCode = variant.size_code || "";
  const isDinner = sizeCode.includes("din") || (!sizeCode.includes("fam") && !sizeCode.includes("bulk"));
  const isFamily = sizeCode.includes("fam");
  const isBulk = sizeCode.includes("bulk");

  // Filter customizations by category and variant type
  const availableCustomizations: ChickenCustomizationsByCategory = {
    sides: allCustomizations.filter((c) => {
      if (!c.applies_to.includes("chicken") || c.category !== "sides") return false;

      // Filter sides based on variant type
      if (isDinner && c.name.includes("(8 PC")) return true;
      if (isFamily && c.name.includes("(Included)")) return true;
      if (isBulk && c.name.includes("Bulk")) return true;

      // Include additional sides that can be added
      if (c.name.includes("Extra") || c.name.includes("Add")) return true;

      return false;
    }),

    preparation: allCustomizations.filter((c) => c.category === "preparation" && c.applies_to.includes("chicken")),

    condiments: allCustomizations.filter((c) => c.category === "condiments" && c.applies_to.includes("chicken")),
  };

  console.log("🍗 Filtered customizations:", {
    sides: availableCustomizations.sides.length,
    preparation: availableCustomizations.preparation.length,
    condiments: availableCustomizations.condiments.length,
    isDinner,
    isFamily,
    isBulk,
  });

  // ==========================================
  // WHITE MEAT TIER GENERATION
  // ==========================================

  const whiteMeatUpcharge = getWhiteMeatUpcharge(variant as ChickenVariant);

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

  // ==========================================
  // VARIANT-SPECIFIC DEFAULT SELECTIONS
  // ==========================================

  const defaultSelections: ConfiguredModifier[] = [];

  if (isFamily) {
    // Family packs get default included sides
    const familySides = ["Coleslaw (Included)", "Broasted Potatoes (Included)", "Garlic Bread (Included)"];

    familySides.forEach((sideName) => {
      const side = availableCustomizations.sides.find((s) => s.name === sideName);
      if (side) {
        defaultSelections.push({
          id: side.id,
          name: side.name,
          priceAdjustment: side.base_price,
        });
      }
    });
  } else if (isDinner) {
    // Regular chicken gets default broasted potatoes
    const defaultSide = availableCustomizations.sides.find((s) => s.name.includes("Broasted Potatoes") && s.name.includes("8 PC"));
    if (defaultSide) {
      defaultSelections.push({
        id: defaultSide.id,
        name: defaultSide.name,
        priceAdjustment: defaultSide.base_price,
      });
    }
  }

  // Default preparation: Regular Cooking
  const regularCooking = availableCustomizations.preparation.find((p) => p.name.includes("Regular") || p.name.includes("Normal"));
  if (regularCooking) {
    defaultSelections.push({
      id: regularCooking.id,
      name: regularCooking.name,
      priceAdjustment: regularCooking.base_price,
    });
  }

  console.log(
    "🥔 Default selections:",
    defaultSelections.map((d) => d.name)
  );

  // ==========================================
  // PRICING CALCULATION FUNCTION
  // ==========================================

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
        if (result.data?.final_price) {
          console.log("✅ API pricing:", result.data.final_price);
          return result.data.final_price;
        }
      }

      console.warn("⚠️ API pricing failed, using fallback");
    } catch (error) {
      console.warn("⚠️ API pricing error, using fallback:", error);
    }

    // Fallback calculation
    return calculateFallbackPrice(variant, whiteMeatTier, selectedCustomizations, availableCustomizations);
  };

  // ==========================================
  // VALIDATION FUNCTION
  // ==========================================

  const validate = (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]): ChickenValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for sides in family packs
    if (isFamily) {
      const hasSides = selectedCustomizations.some((id) =>
        availableCustomizations.sides.find((s) => s.id === id && s.name.includes("Included"))
      );

      if (!hasSides) {
        warnings.push("Family packs include sides at no extra charge - consider selecting included sides");
      }
    }

    // Check preparation selection
    const hasPreparation = selectedCustomizations.some((id) => availableCustomizations.preparation.find((p) => p.id === id));

    if (!hasPreparation) {
      warnings.push("Consider selecting a preparation style (Regular, Well Done, etc.)");
    }

    // Check for multiple preparation selections
    const preparationCount = selectedCustomizations.filter((id) => availableCustomizations.preparation.find((p) => p.id === id)).length;

    if (preparationCount > 1) {
      errors.push("Please select only one preparation style");
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

// ==========================================
// FALLBACK PRICING CALCULATION
// ==========================================

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

  console.log("💰 Fallback price calculation:", {
    basePrice: variant.price,
    whiteMeatCost: whiteMeatTier?.price || 0,
    customizationsCost: totalPrice - variant.price - (whiteMeatTier?.price || 0),
    totalPrice,
  });

  return totalPrice;
}

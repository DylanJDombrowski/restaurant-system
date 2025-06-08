// src/lib/utils/chicken-customization.ts - OPTION B: Works with existing categories
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
  console.log("🐔 Chicken customization hook called:", {
    variantName: variant.name,
    sizeCode: variant.size_code,
    customizationCount: allCustomizations.length,
  });

  // ==========================================
  // VARIANT TYPE DETECTION (Based on CSV analysis)
  // ==========================================
  const variantName = variant.name.toLowerCase();

  // Family packs have "family" in name or are 10+ pc with special sides
  const isFamily =
    variantName.includes("family") ||
    variantName.includes("fam") ||
    (variantName.includes("10") && variantName.includes("pc")) ||
    (parseInt(variantName.match(/(\d+)/)?.[1] || "0") >= 12 && variantName.includes("family"));

  // Bulk orders are 25+ pieces
  const isBulk = variantName.includes("bulk") || parseInt(variantName.match(/(\d+)/)?.[1] || "0") >= 25;

  // Regular dinners are 8-20 pc without "family"
  const isDinner = !isFamily && !isBulk && (variantName.includes("pc") || variantName.includes("piece") || variantName.includes("wing"));

  console.log("🍗 Variant classification:", {
    isDinner,
    isFamily,
    isBulk,
    variantName,
  });

  // ==========================================
  // SMART CUSTOMIZATION FILTERING
  // ==========================================
  const availableCustomizations: ChickenCustomizationsByCategory = {
    sides: allCustomizations.filter((c) => {
      if (!c.applies_to.includes("chicken") || c.category !== "sides") return false;

      const itemName = c.name.toLowerCase();

      if (isDinner) {
        // Regular dinners: Broasted potatoes (included), French fries, extras
        return (
          itemName.includes("broasted potatoes (included)") ||
          itemName.includes("french fries") ||
          itemName.includes("extra broasted") ||
          itemName.includes("extra cole") ||
          itemName.includes("potato wedges")
        );
      }

      if (isFamily) {
        // Family packs: All included sides plus extras and garlic bread options
        return (
          itemName.includes("broasted potatoes (included)") ||
          itemName.includes("french fries") ||
          itemName.includes("cole slaw (included)") ||
          itemName.includes("garlic bread") ||
          itemName.includes("extra") ||
          itemName.includes("no coleslaw") ||
          itemName.includes("potato wedges")
        );
      }

      if (isBulk) {
        // Bulk orders: Only extra/additional sides
        return itemName.includes("extra") || itemName.includes("potato wedges") || itemName.includes("additional");
      }

      return false; // Safety fallback
    }),

    preparation: allCustomizations.filter((c) => c.applies_to.includes("chicken") && c.category === "white_meat"),

    condiments: allCustomizations.filter((c) => c.applies_to.includes("chicken") && c.category === "condiments"),
  };

  console.log("🔧 Filtered customizations:", {
    sides: availableCustomizations.sides.length,
    preparation: availableCustomizations.preparation.length,
    condiments: availableCustomizations.condiments.length,
    sideNames: availableCustomizations.sides.map((s) => s.name),
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
  // INTELLIGENT DEFAULT SELECTIONS
  // ==========================================
  const defaultSelections: ConfiguredModifier[] = [];

  // Add appropriate default sides based on variant type
  if (isDinner) {
    const broastedPotatoes = availableCustomizations.sides.find((s) => s.name.toLowerCase().includes("broasted potatoes (included)"));
    if (broastedPotatoes) {
      defaultSelections.push({
        id: broastedPotatoes.id,
        name: broastedPotatoes.name,
        priceAdjustment: broastedPotatoes.base_price,
      });
    }
  }

  if (isFamily) {
    // Family packs get all included sides by default
    const includedSides = ["broasted potatoes (included)", "cole slaw (included)", "garlic bread (included)"];

    includedSides.forEach((sideName) => {
      const side = availableCustomizations.sides.find((s) => s.name.toLowerCase().includes(sideName));
      if (side) {
        defaultSelections.push({
          id: side.id,
          name: side.name,
          priceAdjustment: side.base_price,
        });
      }
    });
  }

  // Add default preparation (Regular Crispy)
  const defaultPrep = availableCustomizations.preparation.find(
    (p) => p.name.toLowerCase().includes("regular crispy") || p.name.toLowerCase().includes("crispy")
  );
  if (defaultPrep) {
    defaultSelections.push({
      id: defaultPrep.id,
      name: defaultPrep.name,
      priceAdjustment: defaultPrep.base_price,
    });
  }

  console.log("🥔 Default selections:", {
    count: defaultSelections.length,
    items: defaultSelections.map((d) => d.name),
  });

  // ==========================================
  // PRICING CALCULATION WITH FALLBACK
  // ==========================================
  const calculatePrice = async (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]): Promise<number> => {
    try {
      console.log("💰 Calculating chicken price:", {
        variantId: variant.id,
        whiteMeatTier: whiteMeatTier?.level,
        customizationCount: selectedCustomizations.length,
      });

      // Try API first
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
          console.log("✅ API pricing successful:", result.data.final_price);
          return result.data.final_price;
        }
      }

      console.warn("⚠️ API pricing failed, using fallback");
    } catch (error) {
      console.warn("⚠️ API pricing error:", error);
    }

    // Fallback calculation
    return calculateFallbackPrice(variant, whiteMeatTier, selectedCustomizations, allCustomizations);
  };

  // ==========================================
  // VALIDATION WITH BUSINESS RULES
  // ==========================================
  const validate = (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]): ChickenValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // White meat selection required
    if (!whiteMeatTier) {
      errors.push("Please select a white meat option");
    }

    // Check preparation method
    const preparationIds = availableCustomizations.preparation.map((p) => p.id);
    const preparationCount = selectedCustomizations.filter((id) => preparationIds.includes(id)).length;

    if (preparationCount === 0) {
      warnings.push("Consider selecting a preparation style");
    } else if (preparationCount > 1) {
      errors.push("Please select only one preparation style");
    }

    // Family pack recommendations
    if (isFamily) {
      const hasIncludedSides = selectedCustomizations.some((id) => {
        const side = availableCustomizations.sides.find((s) => s.id === id);
        return side && side.name.toLowerCase().includes("included");
      });

      if (!hasIncludedSides) {
        warnings.push("Family packs include sides at no extra charge");
      }
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
  allCustomizations: Customization[]
): number {
  let totalPrice = variant.price;

  // Add white meat cost
  if (whiteMeatTier && whiteMeatTier.price > 0) {
    totalPrice += whiteMeatTier.price;
  }

  // Add customization costs
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

// ==================================================
// FINAL CORRECTED VARIANT-AWARE MODIFIER SYSTEM FOR CHICKEN
// ==================================================

import { MenuItemVariant, Modifier, ConfiguredModifier } from "@/lib/types";

// 1. VARIANT-TO-CATEGORY MAPPING
// ==================================================

interface VariantModifierMapping {
  whiteMeatCategory: string;
  sidesCategory: string;
  preparationCategory: string;
  condimentCategory: string;
}

function getModifierCategoriesForVariant(
  variant: MenuItemVariant
): VariantModifierMapping {
  const sizeCode = variant.size_code;

  // Map size codes to their specific modifier categories
  const categoryMap: Record<string, VariantModifierMapping> = {
    // Regular chicken portions
    "8pc": {
      whiteMeatCategory: "chicken_white_meat_8pc",
      sidesCategory: "chicken_8pc_sides",
      preparationCategory: "chicken_preparation",
      condimentCategory: "chicken_condiment",
    },
    "12pc": {
      whiteMeatCategory: "chicken_white_meat_12pc",
      sidesCategory: "chicken_8pc_sides", // Regular 12pc uses same sides as 8pc
      preparationCategory: "chicken_preparation",
      condimentCategory: "chicken_condiment",
    },
    "16pc": {
      whiteMeatCategory: "chicken_white_meat_16pc",
      sidesCategory: "chicken_8pc_sides",
      preparationCategory: "chicken_preparation",
      condimentCategory: "chicken_condiment",
    },
    "20pc": {
      whiteMeatCategory: "chicken_white_meat_20pc",
      sidesCategory: "chicken_8pc_sides",
      preparationCategory: "chicken_preparation",
      condimentCategory: "chicken_condiment",
    },

    // Family pack portions
    "10pc-fam": {
      whiteMeatCategory: "chicken_white_meat_10pc_family",
      sidesCategory: "chicken_family_sides",
      preparationCategory: "chicken_preparation",
      condimentCategory: "chicken_condiment",
    },
    "12pc-fam": {
      whiteMeatCategory: "chicken_white_meat_12pc_family",
      sidesCategory: "chicken_family_sides",
      preparationCategory: "chicken_preparation",
      condimentCategory: "chicken_condiment",
    },
    "16pc-fam": {
      whiteMeatCategory: "chicken_white_meat_16pc_family",
      sidesCategory: "chicken_family_sides",
      preparationCategory: "chicken_preparation",
      condimentCategory: "chicken_condiment",
    },
    "20pc-fam": {
      whiteMeatCategory: "chicken_white_meat_20pc_family",
      sidesCategory: "chicken_family_sides",
      preparationCategory: "chicken_preparation",
      condimentCategory: "chicken_condiment",
    },
  };

  const mapping = categoryMap[sizeCode];
  if (!mapping) {
    console.warn(`No modifier categories found for variant size: ${sizeCode}`);
    // Fallback to 8pc categories
    return categoryMap["8pc"];
  }

  return mapping;
}

// 2. ENHANCED MODIFIER FILTERING
// ==================================================

interface ModifiersByCategory {
  whiteMeat: Modifier[];
  sides: Modifier[];
  preparation: Modifier[];
  condiments: Modifier[];
}

function getAvailableModifiersForVariant(
  allModifiers: Modifier[],
  variant: MenuItemVariant
): ModifiersByCategory {
  const categories = getModifierCategoriesForVariant(variant);

  return {
    whiteMeat: allModifiers.filter(
      (m) => m.category === categories.whiteMeatCategory
    ),
    sides: allModifiers.filter((m) => m.category === categories.sidesCategory),
    preparation: allModifiers.filter(
      (m) => m.category === categories.preparationCategory
    ),
    condiments: allModifiers.filter(
      (m) => m.category === categories.condimentCategory
    ),
  };
}

// 3. WHITE MEAT TIER SYSTEM
// ==================================================

interface WhiteMeatTier {
  id: string;
  name: string;
  level: "none" | "normal" | "extra" | "xxtra";
  multiplier: number;
}

function getWhiteMeatTiers(whiteMeatModifiers: Modifier[]): WhiteMeatTier[] {
  // Find the base white meat modifier to calculate multipliers
  const baseModifier = whiteMeatModifiers.find(
    (m) =>
      m.name.includes("White Meat") &&
      !m.name.includes("Extra") &&
      !m.name.includes("XXtra")
  );

  if (!baseModifier) {
    return [];
  }

  // Log base price for debugging (prevents unused variable warning)
  console.debug("Base white meat price:", baseModifier.price_adjustment);

  return [
    {
      id: "none",
      name: "All Dark Meat",
      level: "none" as const,
      multiplier: 0,
    },
    {
      id: baseModifier.id,
      name: "White Meat",
      level: "normal" as const,
      multiplier: 1,
    },
    {
      id:
        whiteMeatModifiers.find((m) => m.name.includes("Extra White Meat"))
          ?.id || "",
      name: "Extra White Meat",
      level: "extra" as const,
      multiplier: 2,
    },
    {
      id:
        whiteMeatModifiers.find((m) => m.name.includes("XXtra White Meat"))
          ?.id || "",
      name: "XXtra White Meat",
      level: "xxtra" as const,
      multiplier: 3,
    },
  ].filter((tier) => tier.id !== ""); // Remove tiers without matching modifiers
}

// 4. DEFAULT SELECTION LOGIC
// ==================================================

function getDefaultSelections(
  variant: MenuItemVariant,
  availableModifiers: ModifiersByCategory
): ConfiguredModifier[] {
  const sizeCode = variant.size_code;
  const defaults: ConfiguredModifier[] = [];

  // Family packs get default sides pre-selected
  if (sizeCode.includes("fam")) {
    // Default family sides: Coleslaw, Broasted Potatoes, Garlic Bread
    const defaultSides = [
      "Coleslaw (Included)",
      "Broasted Potatoes (Included)",
      "Garlic Bread (Included)",
    ];

    defaultSides.forEach((sideName) => {
      const modifier = availableModifiers.sides.find(
        (m) => m.name === sideName
      );
      if (modifier) {
        defaults.push({
          id: modifier.id,
          name: modifier.name,
          priceAdjustment: modifier.price_adjustment,
        });
      }
    });
  } else {
    // Regular chicken gets default broasted potatoes
    const defaultSide = availableModifiers.sides.find(
      (m) => m.name === "Broasted Potatoes (8 PC Default)"
    );
    if (defaultSide) {
      defaults.push({
        id: defaultSide.id,
        name: defaultSide.name,
        priceAdjustment: defaultSide.price_adjustment,
      });
    }
  }

  // Default preparation: Regular Cooking
  const defaultPrep = availableModifiers.preparation.find(
    (m) => m.name === "Regular Cooking"
  );
  if (defaultPrep) {
    defaults.push({
      id: defaultPrep.id,
      name: defaultPrep.name,
      priceAdjustment: defaultPrep.price_adjustment,
    });
  }

  return defaults;
}

// 5. PRICING CALCULATION SYSTEM
// ==================================================

function calculateChickenPrice(
  basePrice: number,
  selectedModifiers: ConfiguredModifier[],
  whiteMeatTier: WhiteMeatTier | null
): number {
  let totalPrice = basePrice;

  // Add white meat pricing
  if (whiteMeatTier && whiteMeatTier.level !== "none") {
    // Find base white meat price from modifiers and apply multiplier
    const whiteMeatModifiers = selectedModifiers.filter(
      (m) =>
        m.name.includes("White Meat") &&
        !m.name.includes("Extra") &&
        !m.name.includes("XXtra")
    );

    if (whiteMeatModifiers.length > 0) {
      totalPrice +=
        whiteMeatModifiers[0].priceAdjustment * whiteMeatTier.multiplier;
    }
  }

  // Add other modifier prices
  const otherModifiers = selectedModifiers.filter(
    (m) => !m.name.includes("White Meat")
  );
  totalPrice += otherModifiers.reduce(
    (sum, mod) => sum + mod.priceAdjustment,
    0
  );

  return totalPrice;
}

// 6. VALIDATION SYSTEM
// ==================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateChickenConfiguration(
  selectedModifiers: ConfiguredModifier[],
  whiteMeatTier: WhiteMeatTier | null
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if sides are selected for family packs
  const hasSides = selectedModifiers.some(
    (m) =>
      m.name.includes("Included") ||
      m.name.includes("Potatoes") ||
      m.name.includes("Coleslaw")
  );

  if (!hasSides) {
    warnings.push(
      "No sides selected - family packs include sides at no extra charge"
    );
  }

  // Check white meat selection
  if (!whiteMeatTier || whiteMeatTier.level === "none") {
    warnings.push(
      "All dark meat selected - consider white meat for premium experience"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// 7. MAIN INTEGRATION FUNCTION
// ==================================================

export function useChickenCustomization(
  variant: MenuItemVariant,
  allModifiers: Modifier[]
) {
  const availableModifiers = getAvailableModifiersForVariant(
    allModifiers,
    variant
  );
  const whiteMeatTiers = getWhiteMeatTiers(availableModifiers.whiteMeat);
  const defaultSelections = getDefaultSelections(variant, availableModifiers);

  return {
    availableModifiers,
    whiteMeatTiers,
    defaultSelections,
    calculatePrice: (
      selectedModifiers: ConfiguredModifier[],
      whiteMeatTier: WhiteMeatTier | null
    ) => calculateChickenPrice(variant.price, selectedModifiers, whiteMeatTier),
    validate: (
      selectedModifiers: ConfiguredModifier[],
      whiteMeatTier: WhiteMeatTier | null
    ) => validateChickenConfiguration(selectedModifiers, whiteMeatTier),
  };
}

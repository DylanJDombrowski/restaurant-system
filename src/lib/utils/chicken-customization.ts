// src/lib/utils/chicken-customization.ts - FIXED: Type errors resolved
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
  const variantName = variant.name.toLowerCase();
  const isFamily =
    variantName.includes("family") || (parseInt(variantName.match(/(\d+)/)?.[1] || "0") >= 12 && variantName.includes("piece"));
  const isBulk = variantName.includes("bulk") || parseInt(variantName.match(/(\d+)/)?.[1] || "0") >= 25;
  const isDinner = !isFamily && !isBulk;

  const availableCustomizations: ChickenCustomizationsByCategory = {
    sides: allCustomizations.filter((c) => {
      if (!c.applies_to.includes("chicken") || c.category !== "sides") return false;
      const itemName = c.name.toLowerCase();
      if (isDinner)
        return (
          itemName.includes("broasted potatoes (included)") ||
          itemName.includes("french fries") ||
          itemName.includes("extra") ||
          itemName.includes("potato wedges")
        );
      if (isFamily)
        return (
          itemName.includes("broasted potatoes (included)") ||
          itemName.includes("french fries") ||
          itemName.includes("cole slaw (included)") ||
          itemName.includes("garlic bread") ||
          itemName.includes("extra") ||
          itemName.includes("no coleslaw") ||
          itemName.includes("potato wedges")
        );
      if (isBulk) return itemName.includes("extra") || itemName.includes("potato wedges") || itemName.includes("additional");
      return false;
    }),
    preparation: allCustomizations.filter(
      (c) => (c.category as string) === "preparation" || (c.category as string) === "preparation_chicken"
    ),
    condiments: allCustomizations.filter((c) => (c.category as string) === "condiments" || (c.category as string) === "condiments_chicken"),
  };

  const whiteMeatUpcharge = getWhiteMeatUpcharge(variant as ChickenVariant);
  const whiteMeatTiers: WhiteMeatTier[] = [
    { id: "none", name: "All Dark Meat", level: "none", multiplier: 0, price: 0 },
    { id: "normal", name: `White Meat (+${whiteMeatUpcharge.toFixed(2)})`, level: "normal", multiplier: 1, price: whiteMeatUpcharge },
    {
      id: "extra",
      name: `Extra White Meat (+${(whiteMeatUpcharge * 2).toFixed(2)})`,
      level: "extra",
      multiplier: 2,
      price: whiteMeatUpcharge * 2,
    },
    {
      id: "xxtra",
      name: `XXtra White Meat (+${(whiteMeatUpcharge * 3).toFixed(2)})`,
      level: "xxtra",
      multiplier: 3,
      price: whiteMeatUpcharge * 3,
    },
  ];

  const defaultSelections: ConfiguredModifier[] = [];
  if (isDinner) {
    const side = availableCustomizations.sides.find((s) => s.name.toLowerCase().includes("broasted potatoes (included)"));
    if (side) defaultSelections.push({ id: side.id, name: side.name, priceAdjustment: side.base_price });
  }
  if (isFamily) {
    const includedSides = ["broasted potatoes (included)", "cole slaw (included)", "garlic bread (included)"];
    includedSides.forEach((sideName) => {
      const side = availableCustomizations.sides.find((s) => s.name.toLowerCase().includes(sideName));
      if (side) defaultSelections.push({ id: side.id, name: side.name, priceAdjustment: side.base_price });
    });
  }
  const defaultPrep = availableCustomizations.preparation.find((p) => p.name.toLowerCase().includes("regular crispy"));
  if (defaultPrep) defaultSelections.push({ id: defaultPrep.id, name: defaultPrep.name, priceAdjustment: defaultPrep.base_price });

  const calculatePrice = async (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]): Promise<number> => {
    try {
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
        if (result.data?.final_price) return result.data.final_price;
      }
    } catch (error) {
      console.warn("API pricing error, using fallback:", error);
    }
    // Fallback calculation
    let totalPrice = variant.price + (whiteMeatTier?.price || 0);
    selectedCustomizations.forEach((id) => {
      const custom = allCustomizations.find((c) => c.id === id);
      if (custom) totalPrice += custom.base_price;
    });
    return totalPrice;
  };

  const validate = (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]): ChickenValidationResult => {
    const errors: string[] = [];
    if (!whiteMeatTier) errors.push("Please select a white meat option");
    const prepCount = selectedCustomizations.filter((id) => availableCustomizations.preparation.some((p) => p.id === id)).length;
    if (prepCount > 1) errors.push("Please select only one preparation style");
    return { isValid: errors.length === 0, errors, warnings: [] };
  };

  return { availableCustomizations, whiteMeatTiers, defaultSelections, calculatePrice, validate };
}

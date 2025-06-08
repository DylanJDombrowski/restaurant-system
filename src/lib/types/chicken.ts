// src/lib/types/chicken.ts - Chicken-specific types (FIXED IMPORTS)

import { ConfiguredModifier } from "./cart"; // FIXED: Import from cart.ts
import { Customization } from "./customization";
import { ChickenVariant } from "./menu";

export interface WhiteMeatTier {
  id: string;
  name: string;
  level: "none" | "normal" | "extra" | "xxtra";
  multiplier: number;
  price: number; // Calculated price for this tier
}

export interface ChickenCustomizationsByCategory {
  sides: Customization[];
  preparation: Customization[];
  condiments: Customization[];
}

export interface ChickenCustomizationConfig {
  availableCustomizations: ChickenCustomizationsByCategory;
  whiteMeatTiers: WhiteMeatTier[];
  defaultSelections: ConfiguredModifier[];
}

export interface ChickenValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ChickenPriceBreakdown {
  base_price: number;
  white_meat_cost: number;
  customizations_cost: number;
  final_price: number;
  breakdown_items: ChickenPriceBreakdownItem[];
}

export interface ChickenPriceBreakdownItem {
  name: string;
  price: number;
  type: "base" | "white_meat" | "customization";
  tier?: string;
}

// Chicken-specific hook result
export interface ChickenCustomizationResult {
  availableCustomizations: ChickenCustomizationsByCategory;
  whiteMeatTiers: WhiteMeatTier[];
  defaultSelections: ConfiguredModifier[];
  calculatePrice: (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]) => Promise<number>;
  validate: (whiteMeatTier: WhiteMeatTier | null, selectedCustomizations: string[]) => ChickenValidationResult;
}

// Type guard to check if a variant is a chicken variant
export function isChickenVariant(variant: ChickenVariant): variant is ChickenVariant {
  return typeof variant.white_meat_upcharge === "number";
}

// Helper to safely get white meat upcharge from any variant
export function getWhiteMeatUpcharge(variant: ChickenVariant): number {
  if (variant && typeof variant.white_meat_upcharge === "number") {
    return variant.white_meat_upcharge;
  }
  return 0;
}

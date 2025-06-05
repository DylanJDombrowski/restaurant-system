// src/lib/types/utils.ts - Utility type functions

import { MenuItem } from "./menu";

export type SafeString = string | null | undefined;

export function safeString(
  value: SafeString,
  defaultValue: string = ""
): string {
  return value ?? defaultValue;
}

export function safeOptionalString(value: SafeString): string | undefined {
  return value === null ? undefined : value ?? undefined;
}

export function isPizzaItem(item: MenuItem): boolean {
  return item.item_type === "pizza";
}

export function isCustomizableItem(item: MenuItem): boolean {
  return item.allows_custom_toppings === true;
}

export function shouldShowCustomizer(item: MenuItem): boolean {
  return isPizzaItem(item) || isCustomizableItem(item);
}

export function needsVariantSelection(item: MenuItem): boolean {
  return !!(item.variants && item.variants.length > 1);
}

// Pizza-specific utilities
export function getSizeDisplayName(sizeCode: string): string {
  const sizeNames: Record<string, string> = {
    "10in": 'Small 10"',
    "12in": 'Medium 12"',
    "14in": 'Large 14"',
    "16in": 'X-Large 16"',
    small: 'Small 10"',
    medium: 'Medium 12"',
    large: 'Large 14"',
    xlarge: 'X-Large 16"',
  };
  return sizeNames[sizeCode] || sizeCode;
}

export function getCrustDisplayName(crustType: string): string {
  const crustNames: Record<string, string> = {
    thin: "Thin Crust",
    double_dough: "Double Dough",
    gluten_free: "Gluten Free",
    stuffed: "Stuffed Crust",
  };
  return crustNames[crustType] || crustType;
}

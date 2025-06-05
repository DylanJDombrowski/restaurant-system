// src/lib/types/constants.ts - Application constants

export const DEFAULT_PREP_TIME = 25; // minutes
export const DEFAULT_TAX_RATE = 0.08; // 8%
export const DEFAULT_DELIVERY_FEE = 3.99;

export const PIZZA_SIZE_MULTIPLIERS: Record<string, number> = {
  small: 0.865, // 10"
  medium: 1.0, // 12" - reference
  large: 1.135, // 14"
  xlarge: 1.351, // 16"
};

export const PIZZA_TIER_MULTIPLIERS = {
  normal: { normal: 1.0, extra: 2.0, xxtra: 3.0 },
  premium: { normal: 1.0, extra: 1.5, xxtra: 2.0 },
  beef: { normal: 1.0, extra: 1.5, xxtra: 2.0 },
};

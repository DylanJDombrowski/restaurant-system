// src/lib/types/cart.ts - Cart and order item types

import { ID, ToppingAmount } from "./core";

export interface ConfiguredTopping {
  id: ID;
  name: string;
  amount: ToppingAmount;
  price: number;
  isDefault: boolean;
  category?: string;
}

export interface ConfiguredModifier {
  id: ID;
  name: string;
  priceAdjustment: number;
}

export interface ConfiguredCartItem {
  id: ID;
  menuItemId: ID;
  menuItemName: string;
  variantId?: ID | null;
  variantName?: string | null;
  quantity: number;
  basePrice: number;
  selectedToppings: ConfiguredTopping[];
  selectedModifiers: ConfiguredModifier[];
  specialInstructions: string | null;
  totalPrice: number;
  displayName: string;
}

// src/lib/utils/cart-transformers.ts
import {
  ConfiguredCartItem,
  ConfiguredTopping,
  ConfiguredModifier,
  InsertOrderItem,
  OrderItemWithDetails,
} from "@/lib/types";

interface SerializedTopping {
  id: string;
  name: string;
  amount: string;
  price: number;
  isDefault: boolean;
  category: string;
}

interface SerializedModifier {
  id: string;
  name: string;
  priceAdjustment: number;
}

export class CartItemTransformer {
  // Convert cart item to database format
  static toOrderItem(
    cartItem: ConfiguredCartItem,
    orderId: string
  ): InsertOrderItem {
    return {
      order_id: orderId,
      menu_item_id: cartItem.menuItemId,
      menu_item_variant_id: cartItem.variantId || undefined,
      quantity: cartItem.quantity,
      unit_price: cartItem.totalPrice,
      total_price: cartItem.totalPrice * cartItem.quantity,
      selected_toppings_json: this.serializeToppings(cartItem.selectedToppings),
      selected_modifiers_json: this.serializeModifiers(
        cartItem.selectedModifiers
      ),
      special_instructions: cartItem.specialInstructions || undefined,
    };
  }

  // Convert database format back to cart item
  static fromOrderItem(orderItem: OrderItemWithDetails): ConfiguredCartItem {
    return {
      id: orderItem.id,
      menuItemId: orderItem.menu_item_id,
      menuItemName: orderItem.menu_item?.name || "Unknown Item",
      variantId: orderItem.menu_item_variant_id || undefined,
      variantName: orderItem.menu_item_variant?.name || undefined,
      quantity: orderItem.quantity,
      basePrice: orderItem.unit_price,
      selectedToppings: this.deserializeToppings(
        orderItem.selected_toppings_json
      ),
      selectedModifiers: this.deserializeModifiers(
        orderItem.selected_modifiers_json
      ),
      specialInstructions: orderItem.special_instructions || "",
      totalPrice: orderItem.unit_price,
      displayName: this.createDisplayName(orderItem),
    };
  }

  private static serializeToppings(
    toppings: ConfiguredTopping[]
  ): SerializedTopping[] {
    return toppings.map((t) => ({
      id: t.id,
      name: t.name,
      amount: t.amount,
      price: t.price,
      isDefault: t.isDefault,
      category: t.category || "other",
    }));
  }

  private static deserializeToppings(json: unknown): ConfiguredTopping[] {
    if (!json || !Array.isArray(json)) return [];
    return (json as SerializedTopping[]).map((t: SerializedTopping) => ({
      id: t.id || "",
      name: t.name || "",
      amount: (t.amount as import("@/lib/types").ToppingAmount) || "normal",
      price: t.price || 0,
      isDefault: t.isDefault || false,
      category: t.category || "other",
    }));
  }

  private static serializeModifiers(
    modifiers: ConfiguredModifier[]
  ): SerializedModifier[] {
    return modifiers.map((m) => ({
      id: m.id,
      name: m.name,
      priceAdjustment: m.priceAdjustment,
    }));
  }

  private static deserializeModifiers(json: unknown): ConfiguredModifier[] {
    if (!json || !Array.isArray(json)) return [];
    return (json as SerializedModifier[]).map((m: SerializedModifier) => ({
      id: m.id || "",
      name: m.name || "",
      priceAdjustment: m.priceAdjustment || 0,
    }));
  }

  private static createDisplayName(orderItem: OrderItemWithDetails): string {
    const baseName = orderItem.menu_item?.name || "Unknown Item";
    const variantName = orderItem.menu_item_variant?.name;
    return variantName ? `${variantName} ${baseName}` : baseName;
  }
}

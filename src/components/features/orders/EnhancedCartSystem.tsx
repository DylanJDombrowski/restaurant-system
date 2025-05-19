"use client";
import { useState, useMemo } from "react";
import {
  ConfiguredCartItem,
  ConfiguredModifier,
  ConfiguredTopping,
} from "@/lib/types";
import PizzaCustomizer from "./PizzaCustomizer";

/**
 * Enhanced Cart System Component
 *
 * This component manages the shopping cart for staff orders. It supports:
 * 1. Displaying configured items with full descriptions
 * 2. In-line quantity adjustments
 * 3. Item customization (opens customizer for complex items)
 * 4. Real-time total calculation
 * 5. Order notes and special instructions
 *
 * Think of this as the digital equivalent of an order pad where staff
 * can see exactly what they're building and make adjustments as needed.
 */

interface EnhancedCartSystemProps {
  items: ConfiguredCartItem[];
  onUpdateItem: (itemId: string, updates: Partial<ConfiguredCartItem>) => void;
  onRemoveItem: (itemId: string) => void;
  restaurantId: string;
  orderSummary: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
  };
}

export default function EnhancedCartSystem({
  items,
  onUpdateItem,
  onRemoveItem,
  orderSummary,
}: EnhancedCartSystemProps) {
  const [customizingItem, setCustomizingItem] =
    useState<ConfiguredCartItem | null>(null);
  const [orderNotes, setOrderNotes] = useState("");

  // Calculate various cart statistics
  const cartStats = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueItems = items.length;
    const totalPrice = items.reduce(
      (sum, item) => sum + item.totalPrice * item.quantity,
      0
    );

    return { totalItems, uniqueItems, totalPrice };
  }, [items]);

  // Handle quantity changes
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(itemId);
    } else {
      onUpdateItem(itemId, { quantity: newQuantity });
    }
  };

  // Handle customization completion
  const handleCustomizationComplete = (updatedItem: ConfiguredCartItem) => {
    onUpdateItem(updatedItem.id, updatedItem);
    setCustomizingItem(null);
  };

  // Handle customization cancellation
  const handleCustomizationCancel = () => {
    setCustomizingItem(null);
  };

  if (customizingItem) {
    return (
      <div className="h-full">
        <PizzaCustomizer
          item={customizingItem}
          onComplete={handleCustomizationComplete}
          onCancel={handleCustomizationCancel}
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg h-full flex flex-col">
      {/* Cart Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Current Order
          {cartStats.totalItems > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              ({cartStats.totalItems} items)
            </span>
          )}
        </h3>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <CartEmptyState />
        ) : (
          <div className="p-4 space-y-3">
            {items.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onQuantityChange={(quantity) =>
                  handleQuantityChange(item.id, quantity)
                }
                onCustomize={() => setCustomizingItem(item)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Notes */}
      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Order Notes
          </label>
          <textarea
            placeholder="Special instructions for this order..."
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Cart Summary */}
      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <OrderSummaryDisplay summary={orderSummary} />
        </div>
      )}
    </div>
  );
}

/**
 * Cart Empty State Component
 *
 * Displays when the cart is empty with helpful guidance.
 */
function CartEmptyState() {
  return (
    <div className="p-8 text-center text-gray-500">
      <div className="text-4xl mb-4">🛒</div>
      <h4 className="text-lg font-medium text-gray-900 mb-2">Cart is Empty</h4>
      <p className="text-sm">
        Add items from the menu to get started with this order.
      </p>
    </div>
  );
}

/**
 * Cart Item Card Component
 *
 * Displays individual cart items with full descriptions and controls.
 * This is where the progressive disclosure really shines - items show
 * their full configuration but remain editable.
 */
interface CartItemCardProps {
  item: ConfiguredCartItem;
  onQuantityChange: (quantity: number) => void;
  onCustomize: () => void;
  onRemove: () => void;
}

function CartItemCard({
  item,
  onQuantityChange,
  onCustomize,
  onRemove,
}: CartItemCardProps) {
  // Determine if item can be customized
  const canCustomize =
    item.menuItemId &&
    (item.selectedToppings !== undefined ||
      item.selectedModifiers !== undefined);

  // Create detailed description of the item
  const getItemDescription = (): string => {
    const parts: string[] = [];

    // Add topping modifications
    if (item.selectedToppings && item.selectedToppings.length > 0) {
      const addedToppings = item.selectedToppings.filter(
        (t: ConfiguredTopping) => !t.isDefault
      );
      const removedDefaults = item.selectedToppings.filter(
        (t: ConfiguredTopping) => t.isDefault && t.amount === "none"
      );

      if (addedToppings.length > 0) {
        const toppingList = addedToppings
          .map((t: ConfiguredTopping) =>
            t.amount === "normal" ? t.name : `${t.amount} ${t.name}`
          )
          .join(", ");
        parts.push(`Add: ${toppingList}`);
      }

      if (removedDefaults.length > 0) {
        const removedList = removedDefaults
          .map((t: ConfiguredTopping) => t.name)
          .join(", ");
        parts.push(`No: ${removedList}`);
      }
    }

    // Add modifier info
    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      const modifierList = item.selectedModifiers
        .map((m: ConfiguredModifier) => m.name)
        .join(", ");
      parts.push(modifierList);
    }

    // Add special instructions
    if (item.specialInstructions) {
      parts.push(`Note: ${item.specialInstructions}`);
    }

    return parts.length > 0 ? parts.join(" • ") : "";
  };

  const itemDescription = getItemDescription();
  const itemTotal = item.totalPrice * item.quantity;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {/* Item name and description */}
          <div className="font-semibold text-gray-900">{item.displayName}</div>

          {itemDescription && (
            <div className="text-sm text-gray-600 mt-1">{itemDescription}</div>
          )}

          {/* Base price per item */}
          <div className="text-sm text-gray-500 mt-1">
            ${item.totalPrice.toFixed(2)} each
          </div>
        </div>

        {/* Controls */}
        <div className="ml-4 flex items-center gap-2">
          {/* Quantity controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onQuantityChange(item.quantity - 1)}
              className="bg-white border border-gray-300 rounded-md w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-gray-50"
              title="Decrease quantity"
            >
              −
            </button>
            <span className="px-3 py-1 text-sm font-semibold min-w-[2rem] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onQuantityChange(item.quantity + 1)}
              className="bg-white border border-gray-300 rounded-md w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-gray-50"
              title="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Total price for this line item */}
          <div className="text-lg font-bold text-green-600 min-w-[4rem] text-right">
            ${itemTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        {canCustomize && (
          <button
            onClick={onCustomize}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Customize
          </button>
        )}
        <button
          onClick={onRemove}
          className="px-3 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
          title="Remove item"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/**
 * Order Summary Display Component
 *
 * Shows the pricing breakdown for the entire order.
 */
interface OrderSummaryDisplayProps {
  summary: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
  };
}

function OrderSummaryDisplay({ summary }: OrderSummaryDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">Subtotal:</span>
        <span className="font-semibold text-gray-900">
          ${summary.subtotal.toFixed(2)}
        </span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-700">Tax:</span>
        <span className="font-semibold text-gray-900">
          ${summary.tax.toFixed(2)}
        </span>
      </div>

      {summary.deliveryFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Delivery Fee:</span>
          <span className="font-semibold text-gray-900">
            ${summary.deliveryFee.toFixed(2)}
          </span>
        </div>
      )}

      <div className="border-t border-gray-300 pt-2 mt-2">
        <div className="flex justify-between text-lg font-bold">
          <span className="text-gray-900">Total:</span>
          <span className="text-green-600">${summary.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Cart Statistics Hook
 *
 * Provides calculated statistics about the current cart state.
 */
export function useCartStatistics(items: ConfiguredCartItem[]) {
  return useMemo(() => {
    const totalItems = items.reduce(
      (sum: number, item: ConfiguredCartItem) => sum + item.quantity,
      0
    );
    const uniqueItems = items.length;
    const subtotal = items.reduce(
      (sum: number, item: ConfiguredCartItem) =>
        sum + item.totalPrice * item.quantity,
      0
    );

    // Calculate tax (8% as per your system)
    const tax = subtotal * 0.08;
    const deliveryFee = 0; // This will be set by parent component
    const total = subtotal + tax + deliveryFee;

    return {
      totalItems,
      uniqueItems,
      subtotal,
      tax,
      deliveryFee,
      total,
    };
  }, [items]);
}

/**
 * Cart Item Factory Functions
 *
 * Helper functions for creating and manipulating cart items.
 */
export class CartItemFactory {
  static createFromMenuItem(
    menuItemId: string,
    menuItemName: string,
    basePrice: number,
    variantId?: string,
    variantName?: string
  ): ConfiguredCartItem {
    const id = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      menuItemId,
      menuItemName,
      variantId,
      variantName,
      quantity: 1,
      basePrice,
      selectedToppings: [],
      selectedModifiers: [],
      totalPrice: basePrice,
      displayName: variantName
        ? `${variantName} ${menuItemName}`
        : menuItemName,
      specialInstructions: "",
    };
  }

  static updatePrice(item: ConfiguredCartItem): ConfiguredCartItem {
    // Calculate price based on base price + toppings + modifiers
    let totalPrice = item.basePrice;

    // Add topping costs
    if (item.selectedToppings) {
      totalPrice += item.selectedToppings.reduce(
        (sum, topping) => sum + topping.price,
        0
      );
    }

    // Add modifier costs
    if (item.selectedModifiers) {
      totalPrice += item.selectedModifiers.reduce(
        (sum, modifier) => sum + modifier.priceAdjustment,
        0
      );
    }

    return {
      ...item,
      totalPrice: Math.max(0, totalPrice), // Ensure price never goes negative
    };
  }

  static createDisplayName(item: ConfiguredCartItem): string {
    const parts: string[] = [];

    if (item.variantName) {
      parts.push(item.variantName);
    }

    parts.push(item.menuItemName);

    return parts.join(" ");
  }
}

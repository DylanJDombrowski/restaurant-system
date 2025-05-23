// src/components/features/orders/EnhancedCartSystem.tsx
"use client";
import { useState, useMemo } from "react";
import {
  ConfiguredCartItem,
  ConfiguredModifier,
  ConfiguredTopping,
  Topping,
  Modifier,
} from "@/lib/types";
import ModalPizzaCustomizer from "./ModalPizzaCustomizer";

/**
 * Enhanced Cart System with Modal Customizer Integration
 *
 * This updated version replaces the old inline customizer with a clean modal
 * that maintains context while providing sophisticated customization capabilities.
 * The key improvement is consistency - staff always see the same customization
 * interface whether they're adding new items or modifying existing ones.
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
  // ==========================================
  // MODAL CUSTOMIZER STATE
  // ==========================================

  const [customizingItem, setCustomizingItem] =
    useState<ConfiguredCartItem | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // State for loading customizer data
  const [availableToppings, setAvailableToppings] = useState<Topping[]>([]);
  const [availableModifiers, setAvailableModifiers] = useState<Modifier[]>([]);
  const [loadingCustomizerData, setLoadingCustomizerData] = useState(false);

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

  // ==========================================
  // CUSTOMIZER DATA LOADING
  // ==========================================

  /**
   * Load toppings and modifiers for the customizer
   * This runs when staff click "Customize" on any item
   */
  const loadCustomizerData = async () => {
    if (loadingCustomizerData) return; // Prevent duplicate calls

    try {
      setLoadingCustomizerData(true);

      // Get restaurant ID for API calls
      const restaurantResponse = await fetch("/api/restaurants");
      const restaurantData = await restaurantResponse.json();
      const restaurantId = restaurantData.data?.id;

      if (!restaurantId) {
        throw new Error("Failed to get restaurant ID");
      }

      // Load toppings
      const toppingsResponse = await fetch(
        `/api/menu/toppings?restaurant_id=${restaurantId}`
      );
      if (toppingsResponse.ok) {
        const toppingsData = await toppingsResponse.json();
        setAvailableToppings(toppingsData.data || []);
      }

      // Load modifiers
      const modifiersResponse = await fetch(
        `/api/menu/modifiers?restaurant_id=${restaurantId}`
      );
      if (modifiersResponse.ok) {
        const modifiersData = await modifiersResponse.json();
        setAvailableModifiers(modifiersData.data || []);
      }
    } catch (error) {
      console.error("Error loading customizer data:", error);
    } finally {
      setLoadingCustomizerData(false);
    }
  };

  // ==========================================
  // CART ITEM MANAGEMENT
  // ==========================================

  // Handle quantity changes
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(itemId);
    } else {
      onUpdateItem(itemId, { quantity: newQuantity });
    }
  };

  // Handle customization request
  const handleCustomizeItem = async (item: ConfiguredCartItem) => {
    // ADDED: Safety check to ensure the item is valid
    if (!item || !item.id) {
      console.error("Invalid item passed to handleCustomizeItem:", item);
      return;
    }

    // ADDED: Ensure specialInstructions is never null
    const safeItem = {
      ...item,
      specialInstructions: item.specialInstructions || "",
      selectedToppings: item.selectedToppings || [],
      selectedModifiers: item.selectedModifiers || [],
    };

    setCustomizingItem(safeItem);
    await loadCustomizerData();
    setShowCustomizer(true);
  };

  // Handle customization completion
  const handleCustomizationComplete = (updatedItem: ConfiguredCartItem) => {
    onUpdateItem(updatedItem.id, updatedItem);
    setShowCustomizer(false);
    setCustomizingItem(null);
  };

  // Handle customization cancellation
  const handleCustomizationCancel = () => {
    setShowCustomizer(false);
    setCustomizingItem(null);
  };

  return (
    <>
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
                  onCustomize={() => handleCustomizeItem(item)}
                  onRemove={() => onRemoveItem(item.id)}
                  customizationLoading={
                    loadingCustomizerData && customizingItem?.id === item.id
                  }
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

      {showCustomizer && customizingItem && (
        <ModalPizzaCustomizer
          item={customizingItem} // ✅ Now safe - we know it's not null
          availableToppings={availableToppings}
          availableModifiers={availableModifiers}
          onComplete={handleCustomizationComplete}
          onCancel={handleCustomizationCancel}
          isOpen={showCustomizer}
        />
      )}
    </>
  );
}

/**
 * Cart Empty State Component - Unchanged
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
 * Improved Cart Item Card Component
 *
 * This version has cleaner styling and better visual hierarchy
 * to reduce the clutter you mentioned. Each item is more scannable
 * while still showing all the necessary information.
 */
interface CartItemCardProps {
  item: ConfiguredCartItem;
  onQuantityChange: (quantity: number) => void;
  onCustomize: () => void;
  onRemove: () => void;
  customizationLoading?: boolean;
}

function CartItemCard({
  item,
  onQuantityChange,
  onCustomize,
  onRemove,
  customizationLoading = false,
}: CartItemCardProps) {
  // Determine if item can be customized
  const canCustomize =
    item.selectedToppings !== undefined || item.selectedModifiers !== undefined;

  // Create a more concise description
  const getItemDescription = (): string => {
    const parts: string[] = [];

    // Show only non-default toppings to reduce clutter
    if (item.selectedToppings && item.selectedToppings.length > 0) {
      const addedToppings = item.selectedToppings.filter(
        (t: ConfiguredTopping) => !t.isDefault || t.amount === "extra"
      );
      const removedDefaults = item.selectedToppings.filter(
        (t: ConfiguredTopping) => t.isDefault && t.amount === "none"
      );

      if (addedToppings.length > 0) {
        const toppingNames = addedToppings
          .map((t: ConfiguredTopping) =>
            t.amount === "extra" ? `Extra ${t.name}` : t.name
          )
          .slice(0, 3); // Limit to first 3 toppings to prevent overflow

        if (addedToppings.length > 3) {
          toppingNames.push(`+${addedToppings.length - 3} more`);
        }

        parts.push(`Add: ${toppingNames.join(", ")}`);
      }

      if (removedDefaults.length > 0) {
        const removedNames = removedDefaults.map(
          (t: ConfiguredTopping) => t.name
        );
        parts.push(`No: ${removedNames.join(", ")}`);
      }
    }

    // Show modifiers more concisely
    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      const modifierNames = item.selectedModifiers.map(
        (m: ConfiguredModifier) => m.name
      );
      parts.push(modifierNames.join(", "));
    }

    return parts.length > 0 ? parts.join(" • ") : "";
  };

  const itemDescription = getItemDescription();
  const itemTotal = item.totalPrice * item.quantity;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          {" "}
          {/* min-w-0 prevents flex item from overflowing */}
          {/* Item name - more prominent */}
          <div className="font-semibold text-gray-900 text-base">
            {item.displayName}
          </div>
          {/* Description - more compact */}
          {itemDescription && (
            <div className="text-sm text-gray-600 mt-1 line-clamp-2">
              {itemDescription}
            </div>
          )}
          {/* Special instructions - only if they exist */}
          {item.specialInstructions && item.specialInstructions.trim() && (
            <div className="text-sm text-blue-600 mt-1 italic">
              Note: {item.specialInstructions}
            </div>
          )}
        </div>

        {/* Right side - quantity and price */}
        <div className="ml-4 flex items-center gap-3">
          {/* Quantity controls - more compact */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onQuantityChange(item.quantity - 1)}
              className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors"
              title="Decrease quantity"
            >
              −
            </button>
            <span className="px-2 py-1 text-sm font-semibold min-w-[1.5rem] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onQuantityChange(item.quantity + 1)}
              className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors"
              title="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Total price */}
          <div className="text-base font-bold text-green-600 min-w-[4rem] text-right">
            ${itemTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Action buttons - more compact row */}
      <div className="flex gap-2 mt-3">
        {canCustomize && (
          <button
            onClick={onCustomize}
            disabled={customizationLoading}
            className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {customizationLoading ? "Loading..." : "Customize"}
          </button>
        )}
        <button
          onClick={onRemove}
          className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
          title="Remove item"
        >
          Remove
        </button>
      </div>

      {/* Unit price - smaller and less prominent */}
      <div className="text-xs text-gray-500 mt-1">
        ${item.totalPrice.toFixed(2)} each
      </div>
    </div>
  );
}

/**
 * Order Summary Display Component - Unchanged
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

// Export the cart statistics hook as well
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

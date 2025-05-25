// src/components/features/orders/OrderCart.tsx - FIXED VERSION
"use client";
import {
  ConfiguredCartItem,
  ConfiguredModifier,
  ConfiguredTopping,
  MenuItemVariant,
  MenuItemWithVariants,
  Modifier,
  Topping,
} from "@/lib/types";
import { useMemo, useState } from "react";
import AppetizerCustomizer from "./AppetizerCustomizer";
import ModalPizzaCustomizer from "./ModalPizzaCustomizer";
import SandwichCustomizer from "./SandwichCustomizer";

/**
 * 🔄 RENAMED: OrderCart (formerly EnhancedCartSystem)
 *
 * SIMPLIFIED: Customer details and order type moved to main page
 * FOCUSED: This component now only handles cart items and customization
 */

interface OrderCartProps {
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
  onCompleteOrder: () => void;
}

export default function OrderCart({ items, onUpdateItem, onRemoveItem, restaurantId, orderSummary, onCompleteOrder }: OrderCartProps) {
  // ==========================================
  // STATE MANAGEMENT - SIMPLIFIED
  // ==========================================

  // Pizza customizer states
  const [customizingItem, setCustomizingItem] = useState<ConfiguredCartItem | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [availableToppings, setAvailableToppings] = useState<Topping[]>([]);
  const [availableModifiers, setAvailableModifiers] = useState<Modifier[]>([]);
  const [loadingCustomizerData, setLoadingCustomizerData] = useState(false);

  // Sandwich customizer states
  const [showSandwichCustomizer, setShowSandwichCustomizer] = useState(false);
  const [customizingSandwichItem, setCustomizingSandwichItem] = useState<MenuItemWithVariants | null>(null);

  // Appetizer customizer states
  const [showAppetizerCustomizer, setShowAppetizerCustomizer] = useState(false);
  const [customizingAppetizerItem, setCustomizingAppetizerItem] = useState<MenuItemWithVariants | null>(null);
  const [customizingAppetizerVariant, setCustomizingAppetizerVariant] = useState<MenuItemVariant | null>(null);

  // Order notes
  const [orderNotes, setOrderNotes] = useState("");

  // Cart statistics
  const cartStats = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueItems = items.length;
    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0);

    return { totalItems, uniqueItems, totalPrice };
  }, [items]);

  // ==========================================
  // CUSTOMIZER DATA LOADING
  // ==========================================

  const loadCustomizerData = async () => {
    if (loadingCustomizerData) return;

    try {
      setLoadingCustomizerData(true);

      const [toppingsResponse, modifiersResponse] = await Promise.all([
        fetch(`/api/menu/toppings?restaurant_id=${restaurantId}`),
        fetch(`/api/menu/modifiers?restaurant_id=${restaurantId}`),
      ]);

      if (toppingsResponse.ok) {
        const toppingsData = await toppingsResponse.json();
        setAvailableToppings(toppingsData.data || []);
      }

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

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(itemId);
    } else {
      onUpdateItem(itemId, { quantity: newQuantity });
    }
  };

  const handleCustomizeItem = async (item: ConfiguredCartItem) => {
    if (!item || !item.id) {
      console.error("Invalid item passed to handleCustomizeItem:", item);
      return;
    }

    console.log("🔧 Cart customize for item:", item.menuItemName);

    try {
      const menuResponse = await fetch(`/api/menu/full?restaurant_id=${restaurantId}`);
      if (!menuResponse.ok) {
        console.error("Failed to load menu data for customization");
        return;
      }

      const menuData = await menuResponse.json();
      const fullMenuItem = menuData.data.menu_items.find((mi: MenuItemWithVariants) => mi.id === item.menuItemId);

      if (!fullMenuItem) {
        console.error("Menu item not found for customization");
        return;
      }

      console.log("📋 Menu item details:", {
        name: fullMenuItem.name,
        item_type: fullMenuItem.item_type,
        category: fullMenuItem.category?.name,
        allows_custom_toppings: fullMenuItem.allows_custom_toppings,
      });

      // 🎯 ROUTING LOGIC WITH APPETIZER SUPPORT

      // Check if it's an appetizer
      if (fullMenuItem.category?.name === "Appetizers") {
        console.log("🍗 Opening appetizer customizer from cart");

        // Find the variant if this cart item has one
        let selectedVariant = null;
        if (item.variantId && fullMenuItem.variants) {
          selectedVariant = fullMenuItem.variants.find((v: MenuItemVariant) => v.id === item.variantId) || null;
        }

        setCustomizingAppetizerItem(fullMenuItem);
        setCustomizingAppetizerVariant(selectedVariant);
        setCustomizingItem(item); // Store existing cart item for state preservation
        setShowAppetizerCustomizer(true);
        return;
      }

      // Check if it's a sandwich
      if (fullMenuItem.category?.name === "Sandwiches") {
        console.log("🥪 Opening sandwich customizer from cart");
        setCustomizingSandwichItem(fullMenuItem);
        setCustomizingItem(item);
        setShowSandwichCustomizer(true);
        return;
      }

      // Pizza or customizable items
      if (fullMenuItem.item_type === "pizza" || fullMenuItem.allows_custom_toppings) {
        console.log("🍕 Opening pizza customizer with existing state");

        // Preserve ALL existing state
        const safeItem: ConfiguredCartItem = {
          ...item,
          // Keep existing selections (don't reset to empty arrays)
          selectedToppings: item.selectedToppings || [],
          selectedModifiers: item.selectedModifiers || [],
          specialInstructions: item.specialInstructions || "",
          // Preserve pricing information
          basePrice: item.basePrice,
          totalPrice: item.totalPrice,
          quantity: item.quantity,
        };

        console.log("🔧 Passing to pizza customizer:", {
          toppings: safeItem.selectedToppings.length,
          modifiers: safeItem.selectedModifiers.length,
          instructions: safeItem.specialInstructions,
        });

        setCustomizingItem(safeItem);
        await loadCustomizerData();
        setShowCustomizer(true);
        return;
      }

      console.log("📝 Item doesn't need customization");
      alert("This item doesn't have customization options.");
    } catch (error) {
      console.error("Error determining customization type:", error);

      // Fallback also preserves state
      const safeItem: ConfiguredCartItem = {
        ...item,
        selectedToppings: item.selectedToppings || [],
        selectedModifiers: item.selectedModifiers || [],
        specialInstructions: item.specialInstructions || "",
      };

      setCustomizingItem(safeItem);
      await loadCustomizerData();
      setShowCustomizer(true);
    }
  };

  // ==========================================
  // CUSTOMIZATION HANDLERS
  // ==========================================

  // Sandwich customization handlers
  const handleSandwichCustomizationComplete = (updatedItem: ConfiguredCartItem) => {
    console.log("🥪 Sandwich customization completed:", updatedItem);

    // Update the SAME cart item (preserve ID and other properties)
    const finalItem: ConfiguredCartItem = {
      ...updatedItem,
      id: customizingItem?.id || updatedItem.id, // Keep original cart item ID
      quantity: customizingItem?.quantity || updatedItem.quantity, // Keep original quantity
    };

    onUpdateItem(finalItem.id, finalItem);
    setShowSandwichCustomizer(false);
    setCustomizingSandwichItem(null);
    setCustomizingItem(null); // Clear the stored state
  };

  const handleSandwichCustomizationCancel = () => {
    setShowSandwichCustomizer(false);
    setCustomizingSandwichItem(null);
    setCustomizingItem(null);
  };

  // Pizza customization handlers
  const handleCustomizationComplete = (updatedItem: ConfiguredCartItem) => {
    console.log("🍕 Pizza customization completed:", updatedItem);

    // The pizza customizer already preserves the item ID correctly
    onUpdateItem(updatedItem.id, updatedItem);
    setShowCustomizer(false);
    setCustomizingItem(null);
  };

  const handleCustomizationCancel = () => {
    setShowCustomizer(false);
    setCustomizingItem(null);
  };

  // Appetizer customization handlers
  const handleAppetizerCustomizationComplete = (updatedItem: ConfiguredCartItem) => {
    console.log("🍗 Appetizer customization completed:", updatedItem);
    onUpdateItem(updatedItem.id, updatedItem);
    setShowAppetizerCustomizer(false);
    setCustomizingAppetizerItem(null);
    setCustomizingAppetizerVariant(null);
    setCustomizingItem(null);
  };

  const handleAppetizerCustomizationCancel = () => {
    setShowAppetizerCustomizer(false);
    setCustomizingAppetizerItem(null);
    setCustomizingAppetizerVariant(null);
    setCustomizingItem(null);
  };

  // ==========================================
  // ORDER COMPLETION LOGIC
  // ==========================================

  const canCompleteOrder = () => {
    return items.length > 0;
  };

  const getCompletionButtonText = () => {
    if (items.length === 0) return "Add Items First";
    return `Complete Order - $${orderSummary.total.toFixed(2)}`;
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <div className="bg-white border border-gray-300 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Current Order
            {cartStats.totalItems > 0 && <span className="ml-2 text-sm font-normal text-gray-600">({cartStats.totalItems} items)</span>}
          </h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <CartEmptyState />
          ) : (
            <div className="p-4 space-y-3">
              {items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onQuantityChange={(quantity) => handleQuantityChange(item.id, quantity)}
                  onCustomize={() => handleCustomizeItem(item)}
                  onRemove={() => onRemoveItem(item.id)}
                  customizationLoading={loadingCustomizerData && customizingItem?.id === item.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Order Notes */}
        {items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-1">Order Notes</label>
            <textarea
              placeholder="Special instructions for this order..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* CART SUMMARY */}
        {items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <OrderSummaryDisplay summary={orderSummary} />

            <button
              onClick={onCompleteOrder}
              disabled={!canCompleteOrder()}
              className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold transition-colors ${
                canCompleteOrder() ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {getCompletionButtonText()}
            </button>
          </div>
        )}
      </div>

      {/* PIZZA MODAL CUSTOMIZER */}
      {showCustomizer && customizingItem && (
        <ModalPizzaCustomizer
          item={customizingItem}
          availableToppings={availableToppings}
          availableModifiers={availableModifiers}
          onComplete={handleCustomizationComplete}
          onCancel={handleCustomizationCancel}
          isOpen={showCustomizer}
        />
      )}

      {/* SANDWICH MODAL CUSTOMIZER */}
      {showSandwichCustomizer && customizingSandwichItem && (
        <SandwichCustomizer
          item={customizingSandwichItem}
          existingCartItem={customizingItem || undefined}
          onComplete={handleSandwichCustomizationComplete}
          onCancel={handleSandwichCustomizationCancel}
          isOpen={showSandwichCustomizer}
        />
      )}

      {/* APPETIZER MODAL CUSTOMIZER */}
      {showAppetizerCustomizer && customizingAppetizerItem && (
        <AppetizerCustomizer
          item={customizingAppetizerItem}
          selectedVariant={customizingAppetizerVariant || undefined}
          existingCartItem={customizingItem || undefined}
          onComplete={handleAppetizerCustomizationComplete}
          onCancel={handleAppetizerCustomizationCancel}
          isOpen={showAppetizerCustomizer}
          restaurantId={restaurantId}
        />
      )}
    </>
  );
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function CartEmptyState() {
  return (
    <div className="p-8 text-center text-gray-500">
      <div className="text-4xl mb-4">🛒</div>
      <h4 className="text-lg font-medium text-gray-900 mb-2">Cart is Empty</h4>
      <p className="text-sm">Add items from the menu to get started with this order.</p>
    </div>
  );
}

interface CartItemCardProps {
  item: ConfiguredCartItem;
  onQuantityChange: (quantity: number) => void;
  onCustomize: () => void;
  onRemove: () => void;
  customizationLoading?: boolean;
}

function CartItemCard({ item, onQuantityChange, onCustomize, onRemove, customizationLoading = false }: CartItemCardProps) {
  const canCustomize = item.selectedToppings !== undefined || item.selectedModifiers !== undefined;

  const getItemDescription = (): string => {
    const parts: string[] = [];

    if (item.selectedToppings && item.selectedToppings.length > 0) {
      const addedToppings = item.selectedToppings.filter((t: ConfiguredTopping) => !t.isDefault || t.amount === "extra");
      const removedDefaults = item.selectedToppings.filter((t: ConfiguredTopping) => t.isDefault && t.amount === "none");

      if (addedToppings.length > 0) {
        const toppingNames = addedToppings.map((t: ConfiguredTopping) => (t.amount === "extra" ? `Extra ${t.name}` : t.name)).slice(0, 3);

        if (addedToppings.length > 3) {
          toppingNames.push(`+${addedToppings.length - 3} more`);
        }

        parts.push(`Add: ${toppingNames.join(", ")}`);
      }

      if (removedDefaults.length > 0) {
        const removedNames = removedDefaults.map((t: ConfiguredTopping) => t.name);
        parts.push(`No: ${removedNames.join(", ")}`);
      }
    }

    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      const modifierNames = item.selectedModifiers.map((m: ConfiguredModifier) => m.name);
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
          <div className="font-semibold text-gray-900 text-base">{item.displayName}</div>

          {itemDescription && <div className="text-sm text-gray-600 mt-1 line-clamp-2">{itemDescription}</div>}

          {item.specialInstructions && item.specialInstructions.trim() && (
            <div className="text-sm text-blue-600 mt-1 italic">Note: {item.specialInstructions}</div>
          )}
        </div>

        <div className="ml-4 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onQuantityChange(item.quantity - 1)}
              className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors"
            >
              −
            </button>
            <span className="px-2 py-1 text-sm font-semibold min-w-[1.5rem] text-center">{item.quantity}</span>
            <button
              onClick={() => onQuantityChange(item.quantity + 1)}
              className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors"
            >
              +
            </button>
          </div>

          <div className="text-base font-bold text-green-600 min-w-[4rem] text-right">${itemTotal.toFixed(2)}</div>
        </div>
      </div>

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
        >
          Remove
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-1">${item.totalPrice.toFixed(2)} each</div>
    </div>
  );
}

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
        <span className="font-semibold text-gray-900">${summary.subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-700">Tax:</span>
        <span className="font-semibold text-gray-900">${summary.tax.toFixed(2)}</span>
      </div>

      {summary.deliveryFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Delivery Fee:</span>
          <span className="font-semibold text-gray-900">${summary.deliveryFee.toFixed(2)}</span>
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

export function useCartStatistics(items: ConfiguredCartItem[]) {
  return useMemo(() => {
    const totalItems = items.reduce((sum: number, item: ConfiguredCartItem) => sum + item.quantity, 0);
    const uniqueItems = items.length;
    const subtotal = items.reduce((sum: number, item: ConfiguredCartItem) => sum + item.totalPrice * item.quantity, 0);

    const tax = subtotal * 0.08;
    const deliveryFee = 0;
    const total = subtotal + tax + deliveryFee;

    return { totalItems, uniqueItems, subtotal, tax, deliveryFee, total };
  }, [items]);
}

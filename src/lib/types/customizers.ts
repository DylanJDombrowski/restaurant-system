// src/lib/types/customizers.ts - Customizer component types

import { ConfiguredCartItem } from "./cart";
import { ID } from "./core";
import { Customization } from "./customization";
import { MenuItemVariant, MenuItemWithVariants } from "./menu";

export interface BaseCustomizerProps {
  item: MenuItemWithVariants;
  existingCartItem?: ConfiguredCartItem;
  onComplete: (cartItem: ConfiguredCartItem) => void;
  onCancel: () => void;
  isOpen: boolean;
  restaurantId: ID;
}

export interface PizzaCustomizerProps extends BaseCustomizerProps {
  selectedVariant?: MenuItemVariant;
  availableCustomizations?: Customization[];
}

export interface ChickenCustomizerProps extends BaseCustomizerProps {
  selectedVariant?: MenuItemVariant;
  availableCustomizations?: Customization[];
}

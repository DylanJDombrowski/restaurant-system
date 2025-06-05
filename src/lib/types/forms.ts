// src/lib/types/forms.ts - Form data types

import { Customization } from "./customization";
import { MenuItem, MenuItemVariant } from "./menu";
import { Customer, CustomerAddress, Order, OrderItem } from "./orders";
import { Staff } from "./restaurant";

export type InsertOrder = Omit<Order, "id" | "created_at" | "updated_at">;
export type InsertOrderItem = Omit<OrderItem, "id" | "created_at">;
export type InsertCustomer = Omit<Customer, "id" | "created_at" | "updated_at">;
export type InsertCustomerAddress = Omit<CustomerAddress, "id" | "created_at">;
export type InsertStaff = Omit<Staff, "id" | "created_at">;
export type InsertMenuItem = Omit<MenuItem, "id" | "created_at" | "updated_at">;
export type InsertMenuItemVariant = Omit<MenuItemVariant, "id">;
export type InsertCustomization = Omit<
  Customization,
  "id" | "created_at" | "updated_at"
>;

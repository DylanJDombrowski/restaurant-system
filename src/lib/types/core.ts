// src/lib/types/core.ts - Core primitives and enums

export type ID = string;
export type Timestamp = string;

// Order and system enums
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";
export type StaffRole = "staff" | "manager" | "admin";
export type OrderType = "pickup" | "delivery";
export type ToppingAmount = "none" | "light" | "normal" | "extra" | "xxtra";

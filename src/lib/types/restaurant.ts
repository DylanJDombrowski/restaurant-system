// src/lib/types/restaurant.ts - Restaurant entities

import { ID, StaffRole, Timestamp } from "./core";

export interface Restaurant {
  id: ID;
  name: string;
  slug: string;
  config: Record<string, unknown>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Staff {
  id: ID;
  restaurant_id: ID;
  email: string;
  name: string;
  role: StaffRole;
  pin_hash?: string | null;
  is_active: boolean;
  created_at: Timestamp;
  pin?: string | null;
}

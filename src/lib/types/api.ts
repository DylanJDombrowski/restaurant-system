// src/lib/types/api.ts - API request/response types

import { ID, Timestamp } from "./core";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiMetadata {
  page?: number;
  limit?: number;
  total?: number;
  has_more?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: Required<ApiMetadata>;
}

// Legacy types for backward compatibility - MARKED FOR REMOVAL
export interface Topping {
  id: ID;
  restaurant_id: ID;
  name: string;
  category: string;
  sort_order: number;
  is_available: boolean;
  created_at: Timestamp;
  is_premium: boolean;
  base_price: number;
}

export interface Modifier {
  id: ID;
  restaurant_id: ID;
  name: string;
  category: string;
  price_adjustment: number;
  is_available: boolean;
  created_at: Timestamp;
  selected: boolean; // UI state
}

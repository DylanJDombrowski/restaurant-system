// src/lib/types/loyalty.ts - Fixed to avoid circular imports

// Define CustomerAddress here to avoid circular import
export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string; // 'Home', 'Work', etc.
  street: string;
  city: string;
  state: string;
  zip_code: string;
  notes?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerLoyaltyDetails {
  id: string;
  restaurant_id: string;
  phone: string;
  email?: string;
  name?: string;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
  recent_transactions?: LoyaltyTransaction[];
  addresses?: CustomerAddress[]; // ✅ Add addresses array
}

export interface LoyaltyRedemption {
  points_to_redeem: number;
  discount_amount: number;
  conversion_rate: number; // e.g., 20 points = $1 (rate = 20)
  remaining_points: number;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  order_id?: string;
  points_earned: number;
  points_redeemed: number;
  transaction_type: "earned" | "redeemed" | "adjusted";
  description?: string;
  created_at: string;
}

export interface RecentCustomer {
  id: string;
  name?: string;
  phone: string;
  loyalty_points: number;
  total_orders: number;
  last_order_date: string;
}

// API Request/Response Types
export interface RedeemPointsRequest {
  order_id: string;
  customer_id: string;
  points_to_redeem: number;
}

export interface RedeemPointsResponse {
  success: boolean;
  discount_applied: number;
  points_redeemed: number;
  remaining_points: number;
  new_order_total: number;
  transaction_id: string;
}

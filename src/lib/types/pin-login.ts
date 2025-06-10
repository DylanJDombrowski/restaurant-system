// src/lib/types/pin-login.ts - New types file for PIN login system

// Base interfaces
export interface PinLoginRequest {
  pin: string;
  restaurant_id: string;
}

export interface DeviceInfo {
  userAgent: string;
  timestamp: string;
  registered_by: string;
  device_name?: string;
  location?: string;
  client_ip?: string;
  registration_timestamp?: string;
  admin_user_id?: string;
  admin_name?: string;
  admin_email?: string;
}

export interface TerminalRegistrationRequest {
  restaurant_id: string;
  device_info: DeviceInfo;
}

export interface StaffPinStatus {
  staff_id: string;
  name: string;
  email: string;
  role: string;
  has_pin: boolean;
  pin_set_date: string | null;
}

export interface SetPinRequest {
  pin?: string; // Optional - if not provided, generates random PIN
  regenerate?: boolean; // Force regenerate even if PIN exists
}

// Restaurant configuration interface
export interface RestaurantConfig {
  tax_rate?: number;
  delivery_fee?: number;
  delivery_radius_miles?: number;
  hours?: Record<string, unknown>;
  features?: Record<string, unknown>;
  theme?: Record<string, unknown>;
  pos_settings?: Record<string, unknown>;
  payment_settings?: Record<string, unknown>;
}

// Staff and Restaurant data interfaces
export interface StaffData {
  id: string;
  email: string;
  name: string;
  role: string;
  restaurant_id: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
}

export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  config: RestaurantConfig;
  created_at: string;
  updated_at: string;
}

export interface SessionData {
  token: string;
  expires_at: string;
}

// Response interfaces
export interface PinLoginResponse {
  success: boolean;
  message: string;
  data: {
    staff: StaffData;
    restaurant: RestaurantData;
    session: SessionData;
  };
}

export interface TerminalRegistrationResponse {
  success: boolean;
  message: string;
  data: {
    registration_id: string;
    restaurant_name: string;
    registered_at: string;
    registered_by: string;
    device_fingerprint: string;
  };
}

export interface DeviceSummary {
  browser: string;
  platform: string;
  registration_time?: string;
}

export interface TerminalRegistration {
  id: string;
  registered_at: string;
  is_active: boolean;
  last_used_at: string | null;
  notes: string | null;
  registered_by: string;
  device_fingerprint: string;
  device_summary: DeviceSummary;
}

export interface SetPinResponse {
  success: boolean;
  message: string;
  data?: {
    staff_id: string;
    staff_name: string;
    staff_email: string;
    pin: string; // ONLY time the PIN is returned in plain text
    method: "custom" | "generated";
    assigned_by: string;
    assigned_at: string;
  };
  error?: string;
  conflict_staff?: string;
}

// Database record interfaces
export interface StaffRecord {
  id: string;
  restaurant_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  pin_hash: string | null;
  last_login: string | null;
  created_at: string;
}

export interface RestaurantRecord {
  id: string;
  name: string;
  slug: string;
  config: RestaurantConfig;
  created_at: string;
  updated_at: string;
}

export interface TerminalRegistrationRecord {
  id: string;
  device_info: DeviceInfo;
  registered_at: string;
  is_active: boolean;
  last_used_at: string | null;
  notes: string | null;
}

export interface StaffInfo {
  name: string;
  email: string;
}

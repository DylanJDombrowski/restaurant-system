// src/lib/types/pin-system.ts - Updated 6-digit PIN system types

// Base interfaces
export interface PinLoginRequest {
  pin: string; // 6-digit PIN
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
  has_pin: boolean;
  staff_id: string;
  staff_name: string;
  staff_email: string;
  pin_set_date?: string;
}

export interface SetPinRequest {
  pin?: string; // Optional 6-digit PIN - if not provided, generates random PIN
  regenerate?: boolean; // Force regenerate even if PIN exists
}

// Enhanced response interfaces for 6-digit system
export interface SetPinResponse {
  success: boolean;
  message: string;
  data: {
    staff_id: string;
    staff_name: string;
    staff_email: string;
    pin: string; // 6-digit PIN - ONLY returned once during creation
    method: "custom" | "generated";
    assigned_by: string;
    assigned_at: string;
  };
}

export interface PinConflictError {
  error: string;
  conflict_staff?: string; // Name of staff member with conflicting PIN
}

// Restaurant configuration interface
export interface RestaurantConfig {
  tax_rate?: number;
  delivery_fee?: number;
  delivery_radius_miles?: number;
  hours?: Record<string, unknown>;
  features?: Record<string, unknown>;
  theme?: Record<string, unknown>;
  pos_settings?: {
    pin_length?: 6; // Always 6 digits in this system
    pin_expiry_days?: number;
    max_login_attempts?: number;
    session_timeout_minutes?: number;
  };
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
  pin_hash?: string; // Hashed 6-digit PIN
  last_login?: string;
  created_at: string;
  updated_at?: string;
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
  staff_id: string;
  restaurant_id: string;
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

// Database record interfaces
export interface StaffRecord {
  id: string;
  restaurant_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  pin_hash: string | null; // bcrypt hash of 6-digit PIN
  last_login: string | null;
  is_logged_in?: boolean;
  login_attempts?: number;
  created_at: string;
  updated_at?: string;
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
  restaurant_id: string;
  device_info: DeviceInfo;
  registered_at: string;
  is_active: boolean;
  last_used_at: string | null;
  notes: string | null;
}

export interface StaffInfo {
  name: string;
  email: string;
  role: string;
}

// PIN validation utilities
export const PIN_VALIDATION = {
  LENGTH: 6,
  PATTERN: /^\d{6}$/,
  MIN_VALUE: 100000,
  MAX_VALUE: 999999,
} as const;

// Helper type guards
export function isValidPin(pin: string): boolean {
  return PIN_VALIDATION.PATTERN.test(pin);
}

export function generateRandomPin(): string {
  return Math.floor(
    PIN_VALIDATION.MIN_VALUE +
      Math.random() * (PIN_VALIDATION.MAX_VALUE - PIN_VALIDATION.MIN_VALUE + 1)
  ).toString();
}

// Security settings
export const SECURITY_CONFIG = {
  BCRYPT_ROUNDS: 12, // Higher security for PIN hashing
  MAX_LOGIN_ATTEMPTS: 3,
  LOCKOUT_DURATION_MINUTES: 15,
  SESSION_TIMEOUT_MINUTES: 480, // 8 hours
  PIN_HISTORY_COUNT: 5, // Remember last 5 PINs to prevent reuse
} as const;

// Form validation types
export interface PinSetupForm {
  useCustomPin: boolean;
  customPin: string;
  confirmPin: string;
}

export interface PinLoginForm {
  pin: string;
  remember?: boolean;
}

// Error types
export interface PinError {
  code:
    | "INVALID_PIN"
    | "PIN_CONFLICT"
    | "PIN_EXPIRED"
    | "ACCOUNT_LOCKED"
    | "PIN_REQUIRED";
  message: string;
  details?: Record<string, unknown>;
}

// Audit log types for PIN operations
export interface PinAuditLog {
  id: string;
  staff_id: string;
  restaurant_id: string;
  action:
    | "PIN_SET"
    | "PIN_RESET"
    | "PIN_REMOVED"
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED";
  performed_by: string; // Admin who performed the action
  timestamp: string;
  details?: {
    method?: "custom" | "generated";
    old_pin_hash?: string;
    failed_attempts?: number;
    device_info?: Partial<DeviceInfo>;
  };
}

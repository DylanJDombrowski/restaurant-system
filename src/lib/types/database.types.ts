export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          restaurant_id: string;
          email: string;
          name: string;
          role: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          email: string;
          name: string;
          role: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          email?: string;
          name?: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          restaurant_id: string;
          phone: string;
          email: string | null;
          name: string | null;
          loyalty_points: number;
          total_orders: number;
          total_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          phone: string;
          email?: string | null;
          name?: string | null;
          loyalty_points?: number;
          total_orders?: number;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          phone?: string;
          email?: string | null;
          name?: string | null;
          loyalty_points?: number;
          total_orders?: number;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      customer_addresses: {
        Row: {
          id: string;
          restaurant_id: string;
          customer_id: string;
          customer_phone: string;
          customer_name: string;
          customer_email: string | null;
          address: string;
          city: string;
          zip: string;
          delivery_instructions: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          customer_id: string;
          customer_phone: string;
          customer_name: string;
          customer_email?: string | null;
          address: string;
          city: string;
          zip: string;
          delivery_instructions?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          customer_id?: string;
          customer_phone?: string;
          customer_name?: string;
          customer_email?: string | null;
          address?: string;
          city?: string;
          zip?: string;
          delivery_instructions?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
      };
      loyalty_transactions: {
        Row: {
          id: string;
          customer_id: string;
          order_id: string | null;
          points_earned: number;
          points_redeemed: number;
          transaction_type: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          order_id?: string | null;
          points_earned?: number;
          points_redeemed?: number;
          transaction_type: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          order_id?: string | null;
          points_earned?: number;
          points_redeemed?: number;
          transaction_type?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          base_price: number;
          prep_time_minutes: number;
          is_available: boolean;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          base_price: number;
          prep_time_minutes?: number;
          is_available?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          base_price?: number;
          prep_time_minutes?: number;
          is_available?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          customer_id: string | null;
          order_number: string;
          customer_name: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          order_type: string | null;
          status: string;
          customer_address: string | null;
          customer_city: string | null;
          customer_zip: string | null;
          delivery_instructions: string | null;
          subtotal: number;
          tax_amount: number;
          tip_amount: number;
          delivery_fee: number;
          total: number;
          scheduled_for: string | null;
          is_scheduled: boolean;
          estimated_ready_time: string | null;
          estimated_delivery_time: string | null;
          special_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          customer_id?: string | null;
          order_number: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_email?: string | null;
          order_type?: string | null;
          status?: string;
          customer_address?: string | null;
          customer_city?: string | null;
          customer_zip?: string | null;
          delivery_instructions?: string | null;
          subtotal: number;
          tax_amount?: number;
          tip_amount?: number;
          delivery_fee?: number;
          total: number;
          scheduled_for?: string | null;
          is_scheduled?: boolean;
          estimated_ready_time?: string | null;
          estimated_delivery_time?: string | null;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          customer_id?: string | null;
          order_number?: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_email?: string | null;
          order_type?: string | null;
          status?: string;
          customer_address?: string | null;
          customer_city?: string | null;
          customer_zip?: string | null;
          delivery_instructions?: string | null;
          subtotal?: number;
          tax_amount?: number;
          tip_amount?: number;
          delivery_fee?: number;
          total?: number;
          scheduled_for?: string | null;
          is_scheduled?: boolean;
          estimated_ready_time?: string | null;
          estimated_delivery_time?: string | null;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          special_instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          special_instructions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          special_instructions?: string | null;
          created_at?: string;
        };
      };
    };
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "completed"
        | "cancelled";
    };
  };
}

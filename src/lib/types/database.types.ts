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
          role: string; // Consider making this a specific enum type if not already
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
          // parent_category_id: string | null; // Optional: for nested categories
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          // parent_category_id?: string | null;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          // parent_category_id?: string | null;
        };
      };
      menu_items: {
        // Represents the base menu item
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string | null; // FK to menu_categories
          name: string;
          description: string | null;
          base_price: number; // Price for the default/smallest variant or 0 if all pricing is in variants
          prep_time_minutes: number | null;
          is_available: boolean;
          item_type: string; // e.g., 'pizza', 'appetizer', 'specialty_pizza', 'byo_pizza'
          image_url: string | null;
          allows_custom_toppings: boolean;
          default_toppings_json: Json | null; // For specialty pizzas
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          base_price?: number;
          prep_time_minutes?: number | null;
          is_available?: boolean;
          item_type: string;
          image_url?: string | null;
          allows_custom_toppings?: boolean;
          default_toppings_json?: Json | null;
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
          prep_time_minutes?: number | null;
          is_available?: boolean;
          item_type?: string;
          image_url?: string | null;
          allows_custom_toppings?: boolean;
          default_toppings_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_item_variants: {
        // For sizes, portions, crust types if they affect price directly
        Row: {
          id: string;
          menu_item_id: string; // FK to menu_items
          name: string; // e.g., "Small 10\"", "Medium 12\"", "6 pc", "Thin Crust", "Double Dough"
          price: number; // Actual price for this variant
          serves: string | null;
          crust_type: string | null; // Specific to pizzas
          sort_order: number;
          is_available: boolean;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          name: string;
          price: number;
          serves?: string | null;
          crust_type?: string | null;
          sort_order?: number;
          is_available?: boolean;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          name?: string;
          price?: number;
          serves?: string | null;
          crust_type?: string | null;
          sort_order?: number;
          is_available?: boolean;
        };
      };
      toppings: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          category: string; // e.g., "Standard", "Premium", "Sauce"
          is_premium: boolean;
          is_available: boolean;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          category: string;
          is_premium?: boolean;
          is_available?: boolean;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          category?: string;
          is_premium?: boolean;
          is_available?: boolean;
        };
      };
      menu_item_variant_topping_prices: {
        // Price of a specific topping for a specific item variant (e.g., pepperoni for Small Pizza)
        Row: {
          id: string;
          menu_item_variant_id: string; // FK to menu_item_variants
          topping_id: string; // FK to toppings
          price: number; // Price for this topping on this specific variant
        };
        Insert: {
          id?: string;
          menu_item_variant_id: string;
          topping_id: string;
          price: number;
        };
        Update: {
          id?: string;
          menu_item_variant_id?: string;
          topping_id?: string;
          price?: number;
        };
      };
      modifiers: {
        // For general add-ons like "Baked with Mozzarella"
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          price_adjustment: number;
          is_available: boolean;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          price_adjustment: number;
          is_available?: boolean;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          price_adjustment?: number;
          is_available?: boolean;
        };
      };
      menu_item_modifiers: {
        // Link modifiers to menu items
        Row: {
          menu_item_id: string;
          modifier_id: string;
        };
        Insert: {
          menu_item_id: string;
          modifier_id: string;
        };
        Update: {
          // Unlikely to update, usually delete/re-insert
          menu_item_id?: string;
          modifier_id?: string;
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
          order_type: string | null; // Consider enum: "pickup", "delivery"
          status: string; // Use the OrderStatus enum
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
          special_instructions: string | null; // Order-level special instructions
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
          status?: string; // Use OrderStatus
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
          status?: string; // Use OrderStatus
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
        // Represents an item within an order
        Row: {
          id: string;
          order_id: string; // FK to orders
          menu_item_id: string; // FK to menu_items (base item)
          menu_item_variant_id: string | null; // FK to menu_item_variants (specific size/type)
          quantity: number;
          unit_price: number; // Price of the variant + selected toppings/modifiers at time of order
          total_price: number;
          // Store selected toppings/modifiers as JSON for historical record and display
          selected_toppings_json: Json | null;
          selected_modifiers_json: Json | null;
          special_instructions: string | null; // Item-level special instructions
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          menu_item_variant_id?: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          selected_toppings_json?: Json | null;
          selected_modifiers_json?: Json | null;
          special_instructions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          menu_item_variant_id?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          selected_toppings_json?: Json | null;
          selected_modifiers_json?: Json | null;
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
      // staff_role_enum: "staff" | "manager" | "admin"; // Example if you want to use DB enum for staff roles
      // order_type_enum: "pickup" | "delivery";
    };
  };
}

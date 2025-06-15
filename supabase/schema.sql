

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."customization_category" AS ENUM (
    'topping_normal',
    'topping_premium',
    'topping_beef',
    'topping_cheese',
    'topping_sauce',
    'white_meat',
    'sides',
    'preparation',
    'condiments',
    'preparation_pizza',
    'preparation_chicken',
    'sides_chicken_dinner',
    'sides_chicken_family',
    'condiments_chicken'
);


ALTER TYPE "public"."customization_category" OWNER TO "postgres";


CREATE TYPE "public"."item_category" AS ENUM (
    'pizza',
    'chicken',
    'sandwich',
    'appetizer'
);


ALTER TYPE "public"."item_category" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."pricing_type" AS ENUM (
    'fixed',
    'multiplied',
    'tiered'
);


ALTER TYPE "public"."pricing_type" OWNER TO "postgres";


CREATE TYPE "public"."template_markup_type" AS ENUM (
    'additive',
    'fixed_price',
    'discounted'
);


ALTER TYPE "public"."template_markup_type" OWNER TO "postgres";


CREATE TYPE "public"."topping_tier" AS ENUM (
    'standard',
    'premium',
    'beef'
);


ALTER TYPE "public"."topping_tier" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_loyalty_points"("customer_id" "uuid", "points" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_points INTEGER;
BEGIN
  UPDATE customers 
  SET loyalty_points = loyalty_points + points
  WHERE id = customer_id
  RETURNING loyalty_points INTO new_points;
  
  RETURN new_points;
END;
$$;


ALTER FUNCTION "public"."add_loyalty_points"("customer_id" "uuid", "points" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_to_total_spent"("customer_id" "uuid", "amount" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_total DECIMAL(10,2);
BEGIN
  UPDATE customers 
  SET total_spent = total_spent + amount
  WHERE id = customer_id
  RETURNING total_spent INTO new_total;
  
  RETURN new_total;
END;
$$;


ALTER FUNCTION "public"."add_to_total_spent"("customer_id" "uuid", "amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_order_times"("order_id" "uuid", "order_type" character varying) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  max_prep_time INTEGER;
  base_time TIMESTAMPTZ;
BEGIN
  -- Get the longest prep time for items in the order
  SELECT MAX(mi.prep_time_minutes) INTO max_prep_time
  FROM order_items oi
  JOIN menu_items mi ON oi.menu_item_id = mi.id
  WHERE oi.order_id = order_id;
  
  -- Set base ready time
  base_time := NOW() + INTERVAL '1 minute' * max_prep_time;
  
  -- Update order with estimated times
  UPDATE orders 
  SET 
    estimated_ready_time = base_time,
    estimated_delivery_time = CASE 
      WHEN order_type = 'delivery' THEN base_time + INTERVAL '20 minutes'
      ELSE NULL
    END
  WHERE id = order_id;
END;
$$;


ALTER FUNCTION "public"."calculate_order_times"("order_id" "uuid", "order_type" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_pizza_price"("p_size_code" "text", "p_crust_type" "text", "p_toppings" "jsonb" DEFAULT '[]'::"jsonb", "p_template_id" "uuid" DEFAULT NULL::"uuid", "p_restaurant_id" "uuid" DEFAULT '008e95ca-7131-42e6-9659-bf7a76026586'::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  base_price decimal := 0;
  crust_upcharge decimal := 0;
  topping_cost decimal := 0;
  final_price decimal;
  breakdown jsonb := '[]'::jsonb;
  topping_record jsonb;
  customization_record record;
  calculated_price decimal;
  placement_text text;
  placement_type text;
  category_tier text;
  amount_tier text;
BEGIN
  -- Get base crust pricing
  SELECT cp.base_price, cp.upcharge
  INTO base_price, crust_upcharge
  FROM crust_pricing cp
  WHERE cp.size_code = p_size_code
    AND cp.crust_type = p_crust_type
    AND cp.restaurant_id = p_restaurant_id
    AND cp.is_available = true;

  -- If no crust pricing found, return error
  IF base_price IS NULL THEN
    RETURN jsonb_build_object('error', format('No pricing found for %s %s', p_size_code, p_crust_type));
  END IF;

  breakdown := breakdown || jsonb_build_object(
    'name', format('%s %s Base', upper(p_size_code), initcap(p_crust_type)),
    'price', base_price,
    'type', 'base'
  );
  
  IF crust_upcharge > 0 THEN
    breakdown := breakdown || jsonb_build_object(
      'name', format('%s Crust Upcharge', initcap(p_crust_type)),
      'price', crust_upcharge,
      'type', 'crust'
    );
  END IF;

  -- Calculate topping costs with fractional support
  FOR topping_record IN SELECT * FROM jsonb_array_elements(p_toppings)
  LOOP
    -- Get customization details
    SELECT * INTO customization_record
    FROM customizations c
    WHERE c.id = (topping_record->>'customization_id')::uuid;

    IF customization_record.id IS NOT NULL THEN
      -- Extract placement and amount
      placement_text := COALESCE(topping_record->>'placement', 'whole');
      amount_tier := topping_record->>'amount';
      
      -- Determine placement type for lookup
      IF placement_text = 'whole' THEN
        placement_type := 'whole';
      ELSIF placement_text IN ('left', 'right') THEN
        placement_type := 'half';
      ELSIF placement_text = 'quarter' THEN
        placement_type := 'quarter';
      ELSIF placement_text = 'three_quarters' THEN
        placement_type := 'three_quarters';
      ELSIF jsonb_typeof(topping_record->'placement') = 'array' THEN
        -- Handle quarter arrays like ["q1"] or ["q1", "q2"]
        CASE jsonb_array_length(topping_record->'placement')
          WHEN 1 THEN placement_type := 'quarter';
          WHEN 2 THEN placement_type := 'half';
          WHEN 3 THEN placement_type := 'three_quarters';
          ELSE placement_type := 'whole';
        END CASE;
      ELSE
        placement_type := 'whole';
      END IF;

      -- Determine category tier from customization
      category_tier := CASE 
        WHEN customization_record.category = 'topping_premium' THEN 'premium'
        WHEN customization_record.category = 'topping_beef' THEN 'beef'
        WHEN customization_record.category = 'topping_sauce' THEN 'free'
        ELSE 'standard'
      END;

      -- Sauces are always free
      IF category_tier = 'free' THEN
        calculated_price := 0;
      ELSE
        -- Get price from matrix
        calculated_price := get_topping_price_from_matrix(
          p_restaurant_id,
          p_size_code,
          category_tier,
          amount_tier,
          placement_type
        );
      END IF;

      topping_cost := topping_cost + calculated_price;

      breakdown := breakdown || jsonb_build_object(
        'name', format('%s (%s, %s)', 
          customization_record.name, 
          upper(amount_tier), 
          CASE placement_type
            WHEN 'whole' THEN 'Full'
            WHEN 'half' THEN 'Half'
            WHEN 'quarter' THEN '1/4'
            WHEN 'three_quarters' THEN '3/4'
            ELSE placement_text
          END
        ),
        'price', calculated_price,
        'type', 'topping',
        'placement', placement_type
      );
    END IF;
  END LOOP;

  final_price := base_price + crust_upcharge + topping_cost;

  RETURN jsonb_build_object(
    'base_price', base_price,
    'crust_upcharge', crust_upcharge,
    'topping_cost', topping_cost,
    'final_price', final_price,
    'breakdown', breakdown
  );
END;
$$;


ALTER FUNCTION "public"."calculate_pizza_price"("p_size_code" "text", "p_crust_type" "text", "p_toppings" "jsonb", "p_template_id" "uuid", "p_restaurant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_template_substitutions"("p_template_id" "uuid", "p_removed_toppings" "jsonb", "p_added_toppings" "jsonb", "p_size_code" "text", "p_restaurant_id" "uuid" DEFAULT '008e95ca-7131-42e6-9659-bf7a76026586'::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  template_record RECORD;
  removed_value DECIMAL := 0;
  added_value DECIMAL := 0;
  max_credit DECIMAL := 0;
  actual_credit DECIMAL := 0;
  net_charge DECIMAL := 0;
  topping_record RECORD;
  customization_record RECORD;
  calculated_price DECIMAL;
BEGIN
  -- Get template details
  SELECT * INTO template_record
  FROM pizza_templates pt
  WHERE pt.id = p_template_id AND pt.restaurant_id = p_restaurant_id;
  
  IF template_record.id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  -- Calculate value of removed toppings
  FOR topping_record IN SELECT * FROM jsonb_to_recordset(p_removed_toppings) AS x(
    customization_id TEXT,
    amount TEXT,
    substitution_tier TEXT
  ) LOOP
    -- Get pricing for this topping
    SELECT calculate_pizza_price(
      p_size_code, 
      'thin', -- Use thin as baseline for substitution calculations
      jsonb_build_array(jsonb_build_object(
        'customization_id', topping_record.customization_id,
        'amount', topping_record.amount
      ))
    )->>'topping_cost' INTO calculated_price;
    
    removed_value := removed_value + COALESCE(calculated_price::DECIMAL, 0);
  END LOOP;
  
  -- Calculate value of added toppings
  FOR topping_record IN SELECT * FROM jsonb_to_recordset(p_added_toppings) AS x(
    customization_id TEXT,
    amount TEXT
  ) LOOP
    -- Get pricing for this topping
    SELECT calculate_pizza_price(
      p_size_code, 
      'thin',
      jsonb_build_array(jsonb_build_object(
        'customization_id', topping_record.customization_id,
        'amount', topping_record.amount
      ))
    )->>'topping_cost' INTO calculated_price;
    
    added_value := added_value + COALESCE(calculated_price::DECIMAL, 0);
  END LOOP;
  
  -- Apply credit limit
  max_credit := removed_value * template_record.credit_limit_percentage;
  actual_credit := LEAST(removed_value, max_credit);
  net_charge := GREATEST(added_value - actual_credit, 0);
  
  RETURN jsonb_build_object(
    'removed_value', removed_value,
    'added_value', added_value,
    'max_credit', max_credit,
    'actual_credit_applied', actual_credit,
    'net_charge', net_charge,
    'credit_limit_hit', (actual_credit < removed_value),
    'credit_limit_percentage', template_record.credit_limit_percentage
  );
END;
$$;


ALTER FUNCTION "public"."calculate_template_substitutions"("p_template_id" "uuid", "p_removed_toppings" "jsonb", "p_added_toppings" "jsonb", "p_size_code" "text", "p_restaurant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_topping_price"("base_price" numeric, "pricing_rules" "jsonb", "size_code" "text", "amount" "text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  size_multiplier decimal := 1.0;
  tier_multiplier decimal := 1.0;
  final_price decimal;
BEGIN
  -- Get size multiplier from pricing rules or use defaults
  IF pricing_rules ? 'size_multipliers' THEN
    size_multiplier := COALESCE(
      (pricing_rules->'size_multipliers'->>size_code)::decimal,
      1.0
    );
  ELSE
    -- Default size multipliers
    CASE size_code
      WHEN '10in' THEN size_multiplier := 0.865;
      WHEN '12in' THEN size_multiplier := 1.0;
      WHEN '14in' THEN size_multiplier := 1.135;
      WHEN '16in' THEN size_multiplier := 1.351;
      ELSE size_multiplier := 1.0;
    END CASE;
  END IF;
  
  -- Get tier multiplier from pricing rules or use defaults
  IF pricing_rules ? 'tier_multipliers' THEN
    tier_multiplier := COALESCE(
      (pricing_rules->'tier_multipliers'->>amount)::decimal,
      1.0
    );
  ELSE
    -- Default tier multipliers
    CASE amount
      WHEN 'light' THEN tier_multiplier := 0.5;
      WHEN 'normal' THEN tier_multiplier := 1.0;
      WHEN 'extra' THEN tier_multiplier := 2.0;
      WHEN 'xxtra' THEN tier_multiplier := 3.0;
      ELSE tier_multiplier := 1.0;
    END CASE;
  END IF;
  
  final_price := base_price * size_multiplier * tier_multiplier;
  
  -- Round to 2 decimal places
  RETURN round(final_price * 100) / 100;
END;
$$;


ALTER FUNCTION "public"."calculate_topping_price"("base_price" numeric, "pricing_rules" "jsonb", "size_code" "text", "amount" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_address"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If setting this address as default, unset all other defaults for this customer
  IF NEW.is_default = true THEN
    UPDATE customer_addresses 
    SET is_default = false 
    WHERE customer_id = NEW.customer_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_kitchen_instructions"("p_order_item_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  order_item_record RECORD;
  menu_item_record RECORD;
  variant_record RECORD;
  instructions TEXT;
  topping_instructions TEXT := '';
  modifier_instructions TEXT := '';
  topping_record JSONB;
  modifier_record JSONB;
BEGIN
  -- Get order item details
  SELECT * INTO order_item_record
  FROM order_items oi
  WHERE oi.id = p_order_item_id;
  
  IF order_item_record.id IS NULL THEN
    RETURN 'Order item not found';
  END IF;
  
  -- Get menu item details
  SELECT * INTO menu_item_record
  FROM menu_items mi
  WHERE mi.id = order_item_record.menu_item_id;
  
  -- FIXED: Initialize variant_record properly
  variant_record := NULL;
  
  -- Get variant details if available
  IF order_item_record.menu_item_variant_id IS NOT NULL THEN
    SELECT * INTO variant_record
    FROM menu_item_variants miv
    WHERE miv.id = order_item_record.menu_item_variant_id;
  END IF;
  
  -- Start building instructions
  instructions := format('--- %s ---', UPPER(menu_item_record.name));
  
  -- FIXED: Check if variant_record was actually found
  IF variant_record IS NOT NULL AND variant_record.name IS NOT NULL THEN
    instructions := instructions || E'\nSize: ' || variant_record.name;
  END IF;
  
  -- Add crust type if available
  IF order_item_record.crust_type IS NOT NULL THEN
    instructions := instructions || E'\nCrust: ' || INITCAP(order_item_record.crust_type);
  END IF;
  
  -- Process toppings
  IF order_item_record.selected_toppings_json IS NOT NULL THEN
    FOR topping_record IN SELECT * FROM jsonb_array_elements(order_item_record.selected_toppings_json) LOOP
      IF topping_instructions = '' THEN
        topping_instructions := E'\n\nTOPPINGS:';
      END IF;
      
      topping_instructions := topping_instructions || format(E'\n• %s (%s)', 
        topping_record->>'name',
        UPPER(topping_record->>'amount')
      );
      
      -- Add price if visible for kitchen
      IF (topping_record->>'price')::DECIMAL > 0 THEN
        topping_instructions := topping_instructions || format(' [+$%.2f]', 
          (topping_record->>'price')::DECIMAL
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Process modifiers
  IF order_item_record.selected_modifiers_json IS NOT NULL THEN
    FOR modifier_record IN SELECT * FROM jsonb_array_elements(order_item_record.selected_modifiers_json) LOOP
      IF modifier_instructions = '' THEN
        modifier_instructions := E'\n\nINSTRUCTIONS:';
      END IF;
      
      modifier_instructions := modifier_instructions || format(E'\n• %s', 
        modifier_record->>'name'
      );
      
      -- Add price if there's a charge
      IF (modifier_record->>'priceAdjustment')::DECIMAL > 0 THEN
        modifier_instructions := modifier_instructions || format(' [+$%.2f]', 
          (modifier_record->>'priceAdjustment')::DECIMAL
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Add special instructions
  IF order_item_record.special_instructions IS NOT NULL AND order_item_record.special_instructions != '' THEN
    instructions := instructions || E'\n\nSPECIAL NOTES: ' || order_item_record.special_instructions;
  END IF;
  
  -- Combine all instructions
  instructions := instructions || topping_instructions || modifier_instructions;
  
  -- Add quantity if more than 1
  IF order_item_record.quantity > 1 THEN
    instructions := format('QUANTITY: %s\n%s', order_item_record.quantity, instructions);
  END IF;
  
  RETURN instructions;
END;
$_$;


ALTER FUNCTION "public"."generate_kitchen_instructions"("p_order_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_staff_pin"("p_staff_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_pin TEXT;
  pin_hash TEXT;
  restaurant_id_val UUID;
  max_attempts INTEGER := 100;
  attempt_count INTEGER := 0;
  pin_exists BOOLEAN;
BEGIN
  -- Get the restaurant_id for this staff member
  SELECT restaurant_id INTO restaurant_id_val
  FROM staff WHERE id = p_staff_id;
  
  IF restaurant_id_val IS NULL THEN
    RAISE EXCEPTION 'Staff member not found: %', p_staff_id;
  END IF;
  
  -- Generate unique PIN for this restaurant
  LOOP
    attempt_count := attempt_count + 1;
    
    IF attempt_count > max_attempts THEN
      RAISE EXCEPTION 'Unable to generate unique PIN after % attempts', max_attempts;
    END IF;
    
    -- Generate random 6-digit PIN
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Hash the PIN
    pin_hash := encode(sha256(new_pin::bytea), 'hex');
    
    -- Check if this PIN hash already exists for this restaurant
    SELECT EXISTS(
      SELECT 1 FROM staff 
      WHERE restaurant_id = restaurant_id_val 
        AND pin_hash = pin_hash
        AND is_active = true
        AND id != p_staff_id
    ) INTO pin_exists;
    
    -- If PIN is unique, break the loop
    IF NOT pin_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Update the staff record with the new PIN hash
  UPDATE staff 
  SET pin_hash = pin_hash,
      updated_at = NOW()
  WHERE id = p_staff_id;
  
  -- Return the plain text PIN (only time it's visible)
  RETURN new_pin;
END;
$$;


ALTER FUNCTION "public"."generate_staff_pin"("p_staff_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_item_customizations"("p_menu_item_id" "uuid", "p_restaurant_id" "uuid" DEFAULT '008e95ca-7131-42e6-9659-bf7a76026586'::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  menu_item_record RECORD;
  customizations_result JSONB := '[]'::JSONB;
  customization_record RECORD;
BEGIN
  -- Get menu item details
  SELECT * INTO menu_item_record
  FROM menu_items mi
  WHERE mi.id = p_menu_item_id AND mi.restaurant_id = p_restaurant_id;
  
  IF menu_item_record.id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;
  
  -- Get customizations based on item type
  FOR customization_record IN 
    SELECT c.*,
           CASE 
             -- FIXED: Cast enum to text for LIKE comparison
             WHEN c.category::TEXT LIKE 'topping_%' THEN 'toppings'
             WHEN c.category = 'white_meat' THEN 'white_meat'
             WHEN c.category = 'sides' THEN 'sides'
             WHEN c.category = 'preparation' THEN 'preparation'
             WHEN c.category = 'condiments' THEN 'condiments'
             ELSE 'other'
           END as group_type
    FROM customizations c
    WHERE c.restaurant_id = p_restaurant_id
      AND c.is_available = true
      AND (
        (menu_item_record.item_type = 'pizza' AND 'pizza'::item_category = ANY(c.applies_to))
        OR (menu_item_record.item_type = 'chicken' AND 'chicken'::item_category = ANY(c.applies_to))
        OR (menu_item_record.category_id IN (
          SELECT id FROM menu_categories WHERE name = 'Sandwiches'
        ) AND 'sandwich'::item_category = ANY(c.applies_to))
        OR (menu_item_record.category_id IN (
          SELECT id FROM menu_categories WHERE name = 'Appetizers'
        ) AND 'appetizer'::item_category = ANY(c.applies_to))
      )
    ORDER BY c.sort_order, c.name
  LOOP
    customizations_result := customizations_result || jsonb_build_object(
      'id', customization_record.id,
      'name', customization_record.name,
      'category', customization_record.category::TEXT,
      'group_type', customization_record.group_type,
      'base_price', customization_record.base_price,
      'price_type', customization_record.price_type::TEXT,
      'pricing_rules', customization_record.pricing_rules,
      'description', customization_record.description,
      'sort_order', customization_record.sort_order
    );
  END LOOP;
  
  RETURN customizations_result;
END;
$$;


ALTER FUNCTION "public"."get_item_customizations"("p_menu_item_id" "uuid", "p_restaurant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pizza_template_with_toppings"("p_template_id" "uuid", "p_restaurant_id" "uuid" DEFAULT '008e95ca-7131-42e6-9659-bf7a76026586'::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  template_record RECORD;
  template_result JSONB;
  toppings_result JSONB := '[]'::JSONB;
  topping_record RECORD;
BEGIN
  -- Get template details
  SELECT * INTO template_record
  FROM pizza_templates pt
  WHERE pt.id = p_template_id AND pt.restaurant_id = p_restaurant_id;
  
  IF template_record.id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get template toppings with customization details
  FOR topping_record IN
    SELECT ptt.*,
           c.name as customization_name,
           c.category as customization_category,
           c.base_price as customization_base_price,
           c.pricing_rules as customization_pricing_rules
    FROM pizza_template_toppings ptt
    JOIN customizations c ON c.id = ptt.customization_id
    WHERE ptt.template_id = p_template_id
    ORDER BY ptt.sort_order, c.name
  LOOP
    toppings_result := toppings_result || jsonb_build_object(
      'id', topping_record.id,
      'customization_id', topping_record.customization_id,
      'customization_name', topping_record.customization_name,
      'customization_category', topping_record.customization_category::TEXT,
      'customization_base_price', topping_record.customization_base_price,
      'customization_pricing_rules', topping_record.customization_pricing_rules,
      'default_amount', topping_record.default_amount,
      'is_removable', topping_record.is_removable,
      'substitution_tier', topping_record.substitution_tier::TEXT,
      'sort_order', topping_record.sort_order
    );
  END LOOP;
  
  -- Build complete template result
  template_result := jsonb_build_object(
    'id', template_record.id,
    'restaurant_id', template_record.restaurant_id,
    'menu_item_id', template_record.menu_item_id,
    'name', template_record.name,
    'markup_type', template_record.markup_type::TEXT,
    'credit_limit_percentage', template_record.credit_limit_percentage,
    'is_active', template_record.is_active,
    'template_toppings', toppings_result
  );
  
  RETURN template_result;
END;
$$;


ALTER FUNCTION "public"."get_pizza_template_with_toppings"("p_template_id" "uuid", "p_restaurant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_topping_price_from_matrix"("size_code" "text", "category_tier" "text", "amount_tier" "text", "placement_multiplier" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  base_price decimal;
  tier_multiplier decimal;
BEGIN
  -- Base prices from Excel for 12" (medium) as reference
  base_price := CASE category_tier
    WHEN 'standard' THEN 1.85
    WHEN 'premium' THEN 3.70
    WHEN 'beef' THEN 5.56
    WHEN 'free' THEN 0.0
    ELSE 1.85
  END;

  -- Size multipliers based on Excel data
  base_price := base_price * CASE size_code
    WHEN '10in' THEN 0.865
    WHEN 'small' THEN 0.865
    WHEN '12in' THEN 1.0
    WHEN 'medium' THEN 1.0
    WHEN '14in' THEN 1.135
    WHEN 'large' THEN 1.135
    WHEN '16in' THEN 1.351
    WHEN 'xlarge' THEN 1.351
    ELSE 1.0
  END;

  -- Amount tier multipliers from Excel
  tier_multiplier := CASE amount_tier
    WHEN 'light' THEN 1.0
    WHEN 'normal' THEN 1.0
    WHEN 'extra' THEN 2.0
    WHEN 'xxtra' THEN 3.0
    ELSE 1.0
  END;

  -- Adjust XXtra multiplier for premium/beef categories
  IF amount_tier = 'xxtra' AND category_tier IN ('premium', 'beef') THEN
    tier_multiplier := 2.0;
  END IF;

  -- Apply placement multiplier and return
  RETURN round((base_price * tier_multiplier * placement_multiplier) * 100) / 100;
END;
$$;


ALTER FUNCTION "public"."get_topping_price_from_matrix"("size_code" "text", "category_tier" "text", "amount_tier" "text", "placement_multiplier" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_topping_price_from_matrix"("p_restaurant_id" "uuid", "p_size_code" "text", "p_category_tier" "text", "p_amount_tier" "text", "p_placement_type" "text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  lookup_price decimal;
  mapped_placement text;
BEGIN
  -- Map placement types to match our data
  mapped_placement := CASE p_placement_type
    WHEN 'left' THEN 'half'
    WHEN 'right' THEN 'half'
    WHEN 'quarter' THEN 'quarter'
    WHEN 'three_quarters' THEN 'three_quarters'
    ELSE 'whole'
  END;

  -- Look up exact price from matrix with table alias to avoid ambiguity
  SELECT fpm.price INTO lookup_price
  FROM fractional_pricing_matrix fpm
  WHERE fpm.restaurant_id = p_restaurant_id
    AND fpm.size_code = p_size_code
    AND fpm.category_tier = p_category_tier
    AND fpm.amount_tier = p_amount_tier
    AND fpm.placement_type = mapped_placement;

  -- Return the exact price or 0 if not found
  RETURN COALESCE(lookup_price, 0.00);
END;
$$;


ALTER FUNCTION "public"."get_topping_price_from_matrix"("p_restaurant_id" "uuid", "p_size_code" "text", "p_category_tier" "text", "p_amount_tier" "text", "p_placement_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_order_loyalty"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  -- When an order is completed, award loyalty points
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Only process if customer_id exists
    IF NEW.customer_id IS NOT NULL THEN
      DECLARE
        points_to_award INTEGER := FLOOR(NEW.total - COALESCE(NEW.loyalty_discount_amount, 0));
        net_points_change INTEGER;
      BEGIN
        -- Calculate net points change (earned - redeemed)
        net_points_change := points_to_award - COALESCE(NEW.loyalty_points_redeemed, 0);
        
        -- Update customer totals
        UPDATE customers 
        SET 
          total_orders = total_orders + 1,
          total_spent = total_spent + NEW.total,
          loyalty_points = loyalty_points + net_points_change,
          updated_at = NOW()
        WHERE id = NEW.customer_id;
        
        -- Log points earned (if any)
        IF points_to_award > 0 THEN
          INSERT INTO loyalty_transactions (
            customer_id,
            order_id,
            points_earned,
            points_redeemed,
            transaction_type,
            description
          ) VALUES (
            NEW.customer_id,
            NEW.id,
            points_to_award,
            0,
            'earned',
            'Points earned from order #' || NEW.order_number || ' ($' || (NEW.total - COALESCE(NEW.loyalty_discount_amount, 0))::text || ')'
          );
        END IF;
        
        -- Log points redeemed (if any) - but only if not already logged
        IF COALESCE(NEW.loyalty_points_redeemed, 0) > 0 AND NOT EXISTS (
          SELECT 1 FROM loyalty_transactions 
          WHERE order_id = NEW.id AND transaction_type = 'redeemed'
        ) THEN
          INSERT INTO loyalty_transactions (
            customer_id,
            order_id,
            points_earned,
            points_redeemed,
            transaction_type,
            description
          ) VALUES (
            NEW.customer_id,
            NEW.id,
            0,
            NEW.loyalty_points_redeemed,
            'redeemed',
            'Points redeemed on order #' || NEW.order_number || ' (-$' || COALESCE(NEW.loyalty_discount_amount, 0)::text || ')'
          );
        END IF;
        
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."handle_order_loyalty"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_total_orders"("customer_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE customers 
  SET total_orders = total_orders + 1
  WHERE id = customer_id
  RETURNING total_orders INTO new_total;
  
  RETURN new_total;
END;
$$;


ALTER FUNCTION "public"."increment_total_orders"("customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_staff_pin"("p_staff_id" "uuid", "p_pin" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result_pin TEXT;
BEGIN
  -- Validate PIN format if provided
  IF p_pin IS NOT NULL THEN
    IF p_pin !~ '^[0-9]{6}' THEN
      RAISE EXCEPTION 'PIN must be exactly 6 digits';
    END IF;
    
    -- Use provided PIN
    UPDATE staff 
    SET pin_hash = encode(sha256(p_pin::bytea), 'hex'),
        updated_at = NOW()
    WHERE id = p_staff_id;
    
    result_pin := p_pin;
  ELSE
    -- Generate random PIN
    result_pin := generate_staff_pin(p_staff_id);
  END IF;
  
  RETURN result_pin;
END;
$$;


ALTER FUNCTION "public"."set_staff_pin"("p_staff_id" "uuid", "p_pin" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_order_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_order_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_customer_addresses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_customer_addresses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_customer_stats"("customer_id" "uuid", "order_total" numeric, "points_earned" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE customers 
  SET 
    total_orders = total_orders + 1,
    total_spent = total_spent + order_total,
    loyalty_points = loyalty_points + points_earned,
    updated_at = NOW()
  WHERE id = customer_id;
END;
$$;


ALTER FUNCTION "public"."update_customer_stats"("customer_id" "uuid", "order_total" numeric, "points_earned" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_pin_login"("p_pin" "text", "p_restaurant_id" "uuid") RETURNS TABLE("staff_id" "uuid", "staff_name" "text", "staff_email" "text", "staff_role" "text", "is_valid" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  pin_hash TEXT;
BEGIN
  -- Hash the provided PIN
  pin_hash := encode(sha256(p_pin::bytea), 'hex');
  
  -- Look for matching staff member
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.email,
    s.role,
    true as is_valid
  FROM staff s
  WHERE s.restaurant_id = p_restaurant_id
    AND s.pin_hash = pin_hash
    AND s.is_active = true;
    
  -- If no results, return invalid
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      false as is_valid;
  END IF;
END;
$$;


ALTER FUNCTION "public"."validate_pin_login"("p_pin" "text", "p_restaurant_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."crust_pricing" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "size_code" "text" NOT NULL,
    "crust_type" "text" NOT NULL,
    "base_price" numeric(10,2) NOT NULL,
    "upcharge" numeric(10,2) DEFAULT 0.00,
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crust_pricing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_addresses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_email" "text",
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "zip" "text" NOT NULL,
    "delivery_instructions" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "customer_id" "uuid"
);


ALTER TABLE "public"."customer_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text",
    "name" "text",
    "loyalty_points" integer DEFAULT 0,
    "total_orders" integer DEFAULT 0,
    "total_spent" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_order_date" timestamp with time zone
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid",
    "name" "text" NOT NULL,
    "category" "public"."customization_category" NOT NULL,
    "base_price" numeric(10,2) NOT NULL,
    "price_type" "public"."pricing_type" DEFAULT 'fixed'::"public"."pricing_type",
    "pricing_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "applies_to" "public"."item_category"[] DEFAULT '{}'::"public"."item_category"[],
    "sort_order" integer DEFAULT 0,
    "is_available" boolean DEFAULT true,
    "description" "text"
);


ALTER TABLE "public"."customizations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customizations_for_chicken" AS
 SELECT "customizations"."id",
    "customizations"."restaurant_id",
    "customizations"."name",
    "customizations"."category",
    "customizations"."base_price",
    "customizations"."pricing_rules",
    "customizations"."sort_order",
    "customizations"."is_available"
   FROM "public"."customizations"
  WHERE (("customizations"."applies_to" @> ARRAY['chicken'::"public"."item_category"]) AND ("customizations"."is_available" = true))
  ORDER BY "customizations"."category", "customizations"."sort_order", "customizations"."name";


ALTER TABLE "public"."customizations_for_chicken" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customizations_for_pizza" AS
 SELECT "customizations"."id",
    "customizations"."restaurant_id",
    "customizations"."name",
    "customizations"."category",
    "customizations"."base_price",
    "customizations"."pricing_rules",
    "customizations"."sort_order",
    "customizations"."is_available"
   FROM "public"."customizations"
  WHERE (("customizations"."applies_to" @> ARRAY['pizza'::"public"."item_category"]) AND ("customizations"."is_available" = true))
  ORDER BY "customizations"."category", "customizations"."sort_order", "customizations"."name";


ALTER TABLE "public"."customizations_for_pizza" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fractional_pricing_matrix" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "size_code" "text" NOT NULL,
    "category_tier" "text" NOT NULL,
    "amount_tier" "text" NOT NULL,
    "placement_type" "text" NOT NULL,
    "price" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fractional_pricing_matrix" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "points_earned" integer DEFAULT 0,
    "points_redeemed" integer DEFAULT 0,
    "transaction_type" character varying(20),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "loyalty_transactions_transaction_type_check" CHECK ((("transaction_type")::"text" = ANY ((ARRAY['earned'::character varying, 'redeemed'::character varying, 'adjusted'::character varying])::"text"[])))
);


ALTER TABLE "public"."loyalty_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "icon_name" character varying(50),
    "color_scheme" character varying(20) DEFAULT 'default'::character varying
);


ALTER TABLE "public"."menu_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_item_variants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "menu_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "size_code" "text",
    "serves" "text",
    "price" numeric(10,2) NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_available" boolean DEFAULT true,
    "prep_time_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "crust_type" character varying(50),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "white_meat_upcharge" numeric(10,2) DEFAULT 0.00
);


ALTER TABLE "public"."menu_item_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "base_price" numeric(10,2) NOT NULL,
    "prep_time_minutes" integer DEFAULT 15,
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "item_type" "text" DEFAULT 'standard'::"text",
    "pizza_style" "text",
    "allows_custom_toppings" boolean DEFAULT true,
    "default_toppings_json" "jsonb",
    "image_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "menu_items_base_price_check" CHECK (("base_price" >= (0)::numeric))
);


ALTER TABLE "public"."menu_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."menu_items_with_details" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "restaurant_id",
    NULL::"uuid" AS "category_id",
    NULL::"text" AS "name",
    NULL::"text" AS "description",
    NULL::numeric(10,2) AS "base_price",
    NULL::integer AS "prep_time_minutes",
    NULL::boolean AS "is_available",
    NULL::timestamp with time zone AS "created_at",
    NULL::"text" AS "item_type",
    NULL::"text" AS "pizza_style",
    NULL::boolean AS "allows_custom_toppings",
    NULL::"jsonb" AS "default_toppings_json",
    NULL::"text" AS "image_url",
    NULL::timestamp with time zone AS "updated_at",
    NULL::"text" AS "category_name",
    NULL::integer AS "category_sort_order",
    NULL::bigint AS "variant_count",
    NULL::numeric AS "min_price",
    NULL::numeric AS "max_price",
    NULL::"text"[] AS "variant_names";


ALTER TABLE "public"."menu_items_with_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "menu_item_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "special_instructions" "text",
    "menu_item_variant_id" "uuid",
    "selected_toppings_json" "jsonb" DEFAULT '[]'::"jsonb",
    "selected_modifiers_json" "jsonb" DEFAULT '[]'::"jsonb",
    "crust_type" "text",
    "crust_upcharge" numeric(10,2) DEFAULT 0.00,
    "template_id" "uuid",
    "topping_placements" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_items"."topping_placements" IS 'Stores placement data for fractional toppings. Format: {"topping_id": {"placement": "left|right|quarter|three_quarters", "quarters": ["q1","q2"]}}';



CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status" "public"."order_status" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "changed_by" "uuid",
    "notes" "text"
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "order_number" "text" NOT NULL,
    "customer_name" "text",
    "customer_phone" "text",
    "customer_email" "text",
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status",
    "subtotal" numeric(10,2) NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "tip_amount" numeric(10,2) DEFAULT 0,
    "total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_type" character varying(20),
    "customer_address" "text",
    "customer_city" "text",
    "customer_zip" "text",
    "delivery_instructions" "text",
    "delivery_fee" numeric(10,2) DEFAULT 0,
    "estimated_ready_time" timestamp with time zone,
    "estimated_delivery_time" timestamp with time zone,
    "special_instructions" "text",
    "customer_id" "uuid",
    "scheduled_for" timestamp with time zone,
    "is_scheduled" boolean DEFAULT false,
    "loyalty_points_redeemed" integer DEFAULT 0,
    "loyalty_discount_amount" numeric(10,2) DEFAULT 0.00,
    "loyalty_redemption_details" "jsonb",
    CONSTRAINT "check_delivery_address" CHECK (((("order_type")::"text" = 'pickup'::"text") OR ((("order_type")::"text" = 'delivery'::"text") AND ("customer_address" IS NOT NULL)))),
    CONSTRAINT "check_scheduled_order" CHECK ((("is_scheduled" = false) OR (("is_scheduled" = true) AND ("scheduled_for" IS NOT NULL) AND ("scheduled_for" > "created_at")))),
    CONSTRAINT "orders_order_type_check" CHECK ((("order_type")::"text" = ANY ((ARRAY['pickup'::character varying, 'delivery'::character varying])::"text"[]))),
    CONSTRAINT "orders_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "orders_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pizza_template_toppings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "customization_id" "uuid" NOT NULL,
    "default_amount" "text" DEFAULT 'normal'::"text",
    "is_removable" boolean DEFAULT true,
    "substitution_tier" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "allows_fractional" boolean DEFAULT true,
    "default_placement" "text" DEFAULT 'whole'::"text"
);


ALTER TABLE "public"."pizza_template_toppings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pizza_template_toppings"."allows_fractional" IS 'Whether this template topping supports fractional placement';



CREATE TABLE IF NOT EXISTS "public"."pizza_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "menu_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "markup_type" "text" DEFAULT 'additive'::"text",
    "credit_limit_percentage" numeric(3,2) DEFAULT 0.50,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pizza_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_change_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_id" "uuid",
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pricing_change_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."restaurants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."restaurants" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurants" IS 'Each user and menu item is tied to a restaurant (multi-tenant system).';



CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "pin_hash" "text",
    "last_login" timestamp with time zone,
    "is_logged_in" boolean DEFAULT false,
    "updated_at" timestamp with time zone,
    CONSTRAINT "staff_role_check" CHECK (("role" = ANY (ARRAY['staff'::"text", 'manager'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "staff_id" "uuid",
    "terminal_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '08:00:00'::interval),
    "is_active" boolean DEFAULT true,
    "login_method" character varying(20) DEFAULT 'email'::character varying,
    "device_info" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."staff_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."terminal_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "device_info" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "registered_by" "uuid",
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "last_used_at" timestamp with time zone,
    "notes" "text"
);


ALTER TABLE "public"."terminal_registrations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."crust_pricing"
    ADD CONSTRAINT "crust_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crust_pricing"
    ADD CONSTRAINT "crust_pricing_restaurant_id_size_code_crust_type_key" UNIQUE ("restaurant_id", "size_code", "crust_type");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_restaurant_id_customer_phone_address_key" UNIQUE ("restaurant_id", "customer_phone", "address");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_restaurant_id_phone_key" UNIQUE ("restaurant_id", "phone");



ALTER TABLE ONLY "public"."customizations"
    ADD CONSTRAINT "customizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fractional_pricing_matrix"
    ADD CONSTRAINT "fractional_pricing_matrix_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_categories"
    ADD CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_item_variants"
    ADD CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pizza_template_toppings"
    ADD CONSTRAINT "pizza_template_toppings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pizza_templates"
    ADD CONSTRAINT "pizza_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_change_log"
    ADD CONSTRAINT "pricing_change_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_sessions"
    ADD CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."terminal_registrations"
    ADD CONSTRAINT "terminal_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_categories"
    ADD CONSTRAINT "unique_category_name_per_restaurant" UNIQUE ("restaurant_id", "name");



ALTER TABLE ONLY "public"."menu_item_variants"
    ADD CONSTRAINT "unique_menu_item_variant" UNIQUE ("menu_item_id", "size_code", "crust_type");



CREATE INDEX "idx_crust_pricing_lookup" ON "public"."crust_pricing" USING "btree" ("restaurant_id", "size_code", "crust_type");



CREATE INDEX "idx_customer_addresses_customer_id" ON "public"."customer_addresses" USING "btree" ("customer_id");



CREATE UNIQUE INDEX "idx_customer_addresses_one_default" ON "public"."customer_addresses" USING "btree" ("customer_id") WHERE ("is_default" = true);



CREATE INDEX "idx_customer_addresses_phone" ON "public"."customer_addresses" USING "btree" ("customer_phone");



CREATE INDEX "idx_customizations_applies_to" ON "public"."customizations" USING "gin" ("applies_to") WHERE ("is_available" = true);



CREATE INDEX "idx_customizations_category" ON "public"."customizations" USING "btree" ("restaurant_id", "category") WHERE ("is_available" = true);



CREATE UNIQUE INDEX "idx_fractional_pricing_unique" ON "public"."fractional_pricing_matrix" USING "btree" ("restaurant_id", "size_code", "category_tier", "amount_tier", "placement_type");



CREATE INDEX "idx_menu_items_category" ON "public"."menu_items" USING "btree" ("category_id");



CREATE INDEX "idx_menu_items_type_available" ON "public"."menu_items" USING "btree" ("item_type", "is_available");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_placements" ON "public"."order_items" USING "gin" ("topping_placements");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "idx_orders_loyalty_redemption" ON "public"."orders" USING "btree" ("loyalty_points_redeemed") WHERE ("loyalty_points_redeemed" > 0);



CREATE INDEX "idx_orders_order_type" ON "public"."orders" USING "btree" ("order_type");



CREATE INDEX "idx_orders_restaurant_status" ON "public"."orders" USING "btree" ("restaurant_id", "status");



CREATE INDEX "idx_pizza_template_toppings_template" ON "public"."pizza_template_toppings" USING "btree" ("template_id", "sort_order");



CREATE INDEX "idx_pizza_templates_menu_item" ON "public"."pizza_templates" USING "btree" ("restaurant_id", "menu_item_id") WHERE ("is_active" = true);



CREATE INDEX "idx_terminal_registrations_restaurant" ON "public"."terminal_registrations" USING "btree" ("restaurant_id", "is_active");



CREATE INDEX "idx_variants_menu_item" ON "public"."menu_item_variants" USING "btree" ("menu_item_id", "sort_order");



CREATE INDEX "idx_variants_white_meat_upcharge" ON "public"."menu_item_variants" USING "btree" ("white_meat_upcharge") WHERE ("white_meat_upcharge" > (0)::numeric);



CREATE OR REPLACE VIEW "public"."menu_items_with_details" AS
 SELECT "mi"."id",
    "mi"."restaurant_id",
    "mi"."category_id",
    "mi"."name",
    "mi"."description",
    "mi"."base_price",
    "mi"."prep_time_minutes",
    "mi"."is_available",
    "mi"."created_at",
    "mi"."item_type",
    "mi"."pizza_style",
    "mi"."allows_custom_toppings",
    "mi"."default_toppings_json",
    "mi"."image_url",
    "mi"."updated_at",
    "mc"."name" AS "category_name",
    "mc"."sort_order" AS "category_sort_order",
    "count"("mv"."id") AS "variant_count",
    "min"("mv"."price") AS "min_price",
    "max"("mv"."price") AS "max_price",
    "array_agg"("mv"."name" ORDER BY "mv"."sort_order") AS "variant_names"
   FROM (("public"."menu_items" "mi"
     LEFT JOIN "public"."menu_categories" "mc" ON (("mi"."category_id" = "mc"."id")))
     LEFT JOIN "public"."menu_item_variants" "mv" ON ((("mi"."id" = "mv"."menu_item_id") AND ("mv"."is_available" = true))))
  WHERE ("mi"."is_available" = true)
  GROUP BY "mi"."id", "mc"."name", "mc"."sort_order";



CREATE OR REPLACE TRIGGER "handle_staff_updated_at" BEFORE UPDATE ON "public"."staff" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "order_status_changed" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."track_order_status_change"();



CREATE OR REPLACE TRIGGER "trigger_customer_addresses_updated_at" BEFORE UPDATE ON "public"."customer_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_customer_addresses_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_ensure_single_default_address" BEFORE INSERT OR UPDATE ON "public"."customer_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_default_address"();



CREATE OR REPLACE TRIGGER "trigger_handle_order_loyalty" AFTER INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_order_loyalty"();



CREATE OR REPLACE TRIGGER "update_menu_item_variants_updated_at" BEFORE UPDATE ON "public"."menu_item_variants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_menu_items_updated_at" BEFORE UPDATE ON "public"."menu_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_restaurants_updated_at" BEFORE UPDATE ON "public"."restaurants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."crust_pricing"
    ADD CONSTRAINT "crust_pricing_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."customizations"
    ADD CONSTRAINT "customizations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_menu_item_variant_id" FOREIGN KEY ("menu_item_variant_id") REFERENCES "public"."menu_item_variants"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."menu_categories"
    ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."menu_item_variants"
    ADD CONSTRAINT "menu_item_variants_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."pizza_templates"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."pizza_template_toppings"
    ADD CONSTRAINT "pizza_template_toppings_customization_id_fkey" FOREIGN KEY ("customization_id") REFERENCES "public"."customizations"("id");



ALTER TABLE ONLY "public"."pizza_template_toppings"
    ADD CONSTRAINT "pizza_template_toppings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."pizza_templates"("id");



ALTER TABLE ONLY "public"."pizza_templates"
    ADD CONSTRAINT "pizza_templates_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id");



ALTER TABLE ONLY "public"."pizza_templates"
    ADD CONSTRAINT "pizza_templates_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."pricing_change_log"
    ADD CONSTRAINT "pricing_change_log_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."staff_sessions"
    ADD CONSTRAINT "staff_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."terminal_registrations"
    ADD CONSTRAINT "terminal_registrations_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."terminal_registrations"
    ADD CONSTRAINT "terminal_registrations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



CREATE POLICY "Allow admin and service_role to manage staff" ON "public"."staff" USING ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Allow all operations on orders" ON "public"."orders" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access to menu item variants" ON "public"."menu_item_variants" FOR SELECT USING (true);



CREATE POLICY "Allow staff to view their own profile" ON "public"."staff" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Anyone can read available menu items" ON "public"."menu_items" FOR SELECT USING (("is_available" = true));



CREATE POLICY "Order items operations" ON "public"."order_items" USING (true) WITH CHECK (true);



CREATE POLICY "Restaurant operations" ON "public"."orders" USING (true) WITH CHECK (true);



CREATE POLICY "Restaurant staff access" ON "public"."customers" USING (("restaurant_id" IN ( SELECT "staff"."restaurant_id"
   FROM "public"."staff"
  WHERE ("staff"."id" = "auth"."uid"()))));



CREATE POLICY "Restaurant staff can manage menu items" ON "public"."menu_items" USING (("restaurant_id" IN ( SELECT "staff"."restaurant_id"
   FROM "public"."staff"
  WHERE ("staff"."id" = "auth"."uid"()))));



CREATE POLICY "Staff can access customer addresses in their restaurant" ON "public"."customer_addresses" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."customers" "c"
     JOIN "public"."staff" "s" ON (("s"."restaurant_id" = "c"."restaurant_id")))
  WHERE (("c"."id" = "customer_addresses"."customer_id") AND ("s"."id" = "auth"."uid"())))));



CREATE POLICY "Staff can manage orders based on role" ON "public"."orders" USING (("restaurant_id" IN ( SELECT "s"."restaurant_id"
   FROM "public"."staff" "s"
  WHERE (("s"."id" = "auth"."uid"()) AND ("s"."is_active" = true) AND ((("s"."permissions" ->> 'orders.view'::"text"))::boolean = true))))) WITH CHECK (("restaurant_id" IN ( SELECT "s"."restaurant_id"
   FROM "public"."staff" "s"
  WHERE (("s"."id" = "auth"."uid"()) AND ("s"."is_active" = true) AND ((("s"."permissions" ->> 'orders.create'::"text"))::boolean = true)))));



CREATE POLICY "Users can view crust pricing for their restaurant" ON "public"."crust_pricing" FOR SELECT USING (("restaurant_id" IN ( SELECT "r"."id"
   FROM "public"."restaurants" "r"
  WHERE ("r"."id" = "crust_pricing"."restaurant_id"))));



CREATE POLICY "Users can view pizza templates for their restaurant" ON "public"."pizza_templates" FOR SELECT USING (("restaurant_id" IN ( SELECT "r"."id"
   FROM "public"."restaurants" "r"
  WHERE ("r"."id" = "pizza_templates"."restaurant_id"))));



CREATE POLICY "Users can view template toppings for their restaurant templates" ON "public"."pizza_template_toppings" FOR SELECT USING (("template_id" IN ( SELECT "pt"."id"
   FROM "public"."pizza_templates" "pt"
  WHERE ("pt"."restaurant_id" IN ( SELECT "r"."id"
           FROM "public"."restaurants" "r"
          WHERE ("r"."id" = "pt"."restaurant_id"))))));



ALTER TABLE "public"."crust_pricing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_item_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pizza_template_toppings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pizza_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."order_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."add_loyalty_points"("customer_id" "uuid", "points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_loyalty_points"("customer_id" "uuid", "points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_loyalty_points"("customer_id" "uuid", "points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_to_total_spent"("customer_id" "uuid", "amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_to_total_spent"("customer_id" "uuid", "amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_to_total_spent"("customer_id" "uuid", "amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_order_times"("order_id" "uuid", "order_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_order_times"("order_id" "uuid", "order_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_order_times"("order_id" "uuid", "order_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_pizza_price"("p_size_code" "text", "p_crust_type" "text", "p_toppings" "jsonb", "p_template_id" "uuid", "p_restaurant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pizza_price"("p_size_code" "text", "p_crust_type" "text", "p_toppings" "jsonb", "p_template_id" "uuid", "p_restaurant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pizza_price"("p_size_code" "text", "p_crust_type" "text", "p_toppings" "jsonb", "p_template_id" "uuid", "p_restaurant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_template_substitutions"("p_template_id" "uuid", "p_removed_toppings" "jsonb", "p_added_toppings" "jsonb", "p_size_code" "text", "p_restaurant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_template_substitutions"("p_template_id" "uuid", "p_removed_toppings" "jsonb", "p_added_toppings" "jsonb", "p_size_code" "text", "p_restaurant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_template_substitutions"("p_template_id" "uuid", "p_removed_toppings" "jsonb", "p_added_toppings" "jsonb", "p_size_code" "text", "p_restaurant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_topping_price"("base_price" numeric, "pricing_rules" "jsonb", "size_code" "text", "amount" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_topping_price"("base_price" numeric, "pricing_rules" "jsonb", "size_code" "text", "amount" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_topping_price"("base_price" numeric, "pricing_rules" "jsonb", "size_code" "text", "amount" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_kitchen_instructions"("p_order_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_kitchen_instructions"("p_order_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_kitchen_instructions"("p_order_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_staff_pin"("p_staff_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_staff_pin"("p_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_staff_pin"("p_staff_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_item_customizations"("p_menu_item_id" "uuid", "p_restaurant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_item_customizations"("p_menu_item_id" "uuid", "p_restaurant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_item_customizations"("p_menu_item_id" "uuid", "p_restaurant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pizza_template_with_toppings"("p_template_id" "uuid", "p_restaurant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pizza_template_with_toppings"("p_template_id" "uuid", "p_restaurant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pizza_template_with_toppings"("p_template_id" "uuid", "p_restaurant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_topping_price_from_matrix"("size_code" "text", "category_tier" "text", "amount_tier" "text", "placement_multiplier" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_topping_price_from_matrix"("size_code" "text", "category_tier" "text", "amount_tier" "text", "placement_multiplier" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_topping_price_from_matrix"("size_code" "text", "category_tier" "text", "amount_tier" "text", "placement_multiplier" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_topping_price_from_matrix"("p_restaurant_id" "uuid", "p_size_code" "text", "p_category_tier" "text", "p_amount_tier" "text", "p_placement_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_topping_price_from_matrix"("p_restaurant_id" "uuid", "p_size_code" "text", "p_category_tier" "text", "p_amount_tier" "text", "p_placement_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_topping_price_from_matrix"("p_restaurant_id" "uuid", "p_size_code" "text", "p_category_tier" "text", "p_amount_tier" "text", "p_placement_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_order_loyalty"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_order_loyalty"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_order_loyalty"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_total_orders"("customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_total_orders"("customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_total_orders"("customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_staff_pin"("p_staff_id" "uuid", "p_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_staff_pin"("p_staff_id" "uuid", "p_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_staff_pin"("p_staff_id" "uuid", "p_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_order_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_order_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_order_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_customer_addresses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_customer_addresses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_customer_addresses_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_customer_stats"("customer_id" "uuid", "order_total" numeric, "points_earned" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_customer_stats"("customer_id" "uuid", "order_total" numeric, "points_earned" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_customer_stats"("customer_id" "uuid", "order_total" numeric, "points_earned" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_pin_login"("p_pin" "text", "p_restaurant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_pin_login"("p_pin" "text", "p_restaurant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_pin_login"("p_pin" "text", "p_restaurant_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."crust_pricing" TO "anon";
GRANT ALL ON TABLE "public"."crust_pricing" TO "authenticated";
GRANT ALL ON TABLE "public"."crust_pricing" TO "service_role";



GRANT ALL ON TABLE "public"."customer_addresses" TO "anon";
GRANT ALL ON TABLE "public"."customer_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."customizations" TO "anon";
GRANT ALL ON TABLE "public"."customizations" TO "authenticated";
GRANT ALL ON TABLE "public"."customizations" TO "service_role";



GRANT ALL ON TABLE "public"."customizations_for_chicken" TO "anon";
GRANT ALL ON TABLE "public"."customizations_for_chicken" TO "authenticated";
GRANT ALL ON TABLE "public"."customizations_for_chicken" TO "service_role";



GRANT ALL ON TABLE "public"."customizations_for_pizza" TO "anon";
GRANT ALL ON TABLE "public"."customizations_for_pizza" TO "authenticated";
GRANT ALL ON TABLE "public"."customizations_for_pizza" TO "service_role";



GRANT ALL ON TABLE "public"."fractional_pricing_matrix" TO "anon";
GRANT ALL ON TABLE "public"."fractional_pricing_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."fractional_pricing_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_transactions" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."menu_categories" TO "anon";
GRANT ALL ON TABLE "public"."menu_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_categories" TO "service_role";



GRANT ALL ON TABLE "public"."menu_item_variants" TO "anon";
GRANT ALL ON TABLE "public"."menu_item_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_item_variants" TO "service_role";



GRANT ALL ON TABLE "public"."menu_items" TO "anon";
GRANT ALL ON TABLE "public"."menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_items" TO "service_role";



GRANT ALL ON TABLE "public"."menu_items_with_details" TO "anon";
GRANT ALL ON TABLE "public"."menu_items_with_details" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_items_with_details" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."pizza_template_toppings" TO "anon";
GRANT ALL ON TABLE "public"."pizza_template_toppings" TO "authenticated";
GRANT ALL ON TABLE "public"."pizza_template_toppings" TO "service_role";



GRANT ALL ON TABLE "public"."pizza_templates" TO "anon";
GRANT ALL ON TABLE "public"."pizza_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pizza_templates" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_change_log" TO "anon";
GRANT ALL ON TABLE "public"."pricing_change_log" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_change_log" TO "service_role";



GRANT ALL ON TABLE "public"."restaurants" TO "anon";
GRANT ALL ON TABLE "public"."restaurants" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurants" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_sessions" TO "anon";
GRANT ALL ON TABLE "public"."staff_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."terminal_registrations" TO "anon";
GRANT ALL ON TABLE "public"."terminal_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."terminal_registrations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;

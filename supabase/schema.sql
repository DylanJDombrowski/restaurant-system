

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






CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


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
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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


CREATE TABLE IF NOT EXISTS "public"."menu_item_modifiers" (
    "menu_item_id" "uuid" NOT NULL,
    "modifier_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."menu_item_modifiers" OWNER TO "postgres";


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
    "updated_at" timestamp with time zone DEFAULT "now"()
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


CREATE TABLE IF NOT EXISTS "public"."modifiers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price_adjustment" numeric(10,2) DEFAULT 0,
    "category" "text" DEFAULT 'preparation'::"text",
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."modifiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_item_modifiers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "modifier_type" character varying(50) NOT NULL,
    "modifier_name" "text" NOT NULL,
    "modifier_value" "text",
    "price_modification" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_item_modifiers" OWNER TO "postgres";


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
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


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
    CONSTRAINT "check_delivery_address" CHECK (((("order_type")::"text" = 'pickup'::"text") OR ((("order_type")::"text" = 'delivery'::"text") AND ("customer_address" IS NOT NULL)))),
    CONSTRAINT "check_scheduled_order" CHECK ((("is_scheduled" = false) OR (("is_scheduled" = true) AND ("scheduled_for" IS NOT NULL) AND ("scheduled_for" > "created_at")))),
    CONSTRAINT "orders_order_type_check" CHECK ((("order_type")::"text" = ANY ((ARRAY['pickup'::character varying, 'delivery'::character varying])::"text"[]))),
    CONSTRAINT "orders_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "orders_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


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
    CONSTRAINT "staff_role_check" CHECK (("role" = ANY (ARRAY['staff'::"text", 'manager'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "staff_id" "uuid",
    "terminal_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '08:00:00'::interval),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."staff_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topping_prices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "topping_id" "uuid" NOT NULL,
    "menu_item_variant_id" "uuid" NOT NULL,
    "price" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."topping_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."toppings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_premium" boolean DEFAULT false,
    "base_price" numeric(5,2) DEFAULT 2.00
);


ALTER TABLE "public"."toppings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."toppings_with_pricing" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "restaurant_id",
    NULL::"text" AS "name",
    NULL::"text" AS "category",
    NULL::integer AS "sort_order",
    NULL::boolean AS "is_available",
    NULL::timestamp with time zone AS "created_at",
    NULL::boolean AS "is_premium",
    NULL::numeric(5,2) AS "base_price",
    NULL::"jsonb" AS "variant_pricing";


ALTER TABLE "public"."toppings_with_pricing" OWNER TO "postgres";


ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_restaurant_id_customer_phone_address_key" UNIQUE ("restaurant_id", "customer_phone", "address");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_restaurant_id_phone_key" UNIQUE ("restaurant_id", "phone");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_categories"
    ADD CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_item_modifiers"
    ADD CONSTRAINT "menu_item_modifiers_pkey" PRIMARY KEY ("menu_item_id", "modifier_id");



ALTER TABLE ONLY "public"."menu_item_variants"
    ADD CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modifiers"
    ADD CONSTRAINT "modifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_item_modifiers"
    ADD CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."topping_prices"
    ADD CONSTRAINT "topping_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topping_prices"
    ADD CONSTRAINT "topping_prices_topping_id_menu_item_variant_id_key" UNIQUE ("topping_id", "menu_item_variant_id");



ALTER TABLE ONLY "public"."toppings"
    ADD CONSTRAINT "toppings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_categories"
    ADD CONSTRAINT "unique_category_name_per_restaurant" UNIQUE ("restaurant_id", "name");



CREATE INDEX "idx_customer_addresses_customer_id" ON "public"."customer_addresses" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_addresses_phone" ON "public"."customer_addresses" USING "btree" ("customer_phone");



CREATE INDEX "idx_menu_items_category" ON "public"."menu_items" USING "btree" ("category_id");



CREATE INDEX "idx_menu_items_type_available" ON "public"."menu_items" USING "btree" ("item_type", "is_available");



CREATE INDEX "idx_modifiers_category" ON "public"."modifiers" USING "btree" ("category", "is_available");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "idx_orders_order_type" ON "public"."orders" USING "btree" ("order_type");



CREATE INDEX "idx_orders_restaurant_status" ON "public"."orders" USING "btree" ("restaurant_id", "status");



CREATE INDEX "idx_topping_prices_variant_lookup" ON "public"."topping_prices" USING "btree" ("menu_item_variant_id");



CREATE INDEX "idx_toppings_category_available" ON "public"."toppings" USING "btree" ("category", "is_available");



CREATE INDEX "idx_toppings_restaurant_category" ON "public"."toppings" USING "btree" ("restaurant_id", "category");



CREATE INDEX "idx_variants_menu_item" ON "public"."menu_item_variants" USING "btree" ("menu_item_id", "sort_order");



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



CREATE OR REPLACE VIEW "public"."toppings_with_pricing" AS
 SELECT "t"."id",
    "t"."restaurant_id",
    "t"."name",
    "t"."category",
    "t"."sort_order",
    "t"."is_available",
    "t"."created_at",
    "t"."is_premium",
    "t"."base_price",
    COALESCE("jsonb_agg"("jsonb_build_object"('variant_id', "tp"."menu_item_variant_id", 'variant_name', "mv"."name", 'price', "tp"."price") ORDER BY "mv"."sort_order") FILTER (WHERE ("tp"."id" IS NOT NULL)), '[]'::"jsonb") AS "variant_pricing"
   FROM (("public"."toppings" "t"
     LEFT JOIN "public"."topping_prices" "tp" ON (("t"."id" = "tp"."topping_id")))
     LEFT JOIN "public"."menu_item_variants" "mv" ON (("tp"."menu_item_variant_id" = "mv"."id")))
  WHERE ("t"."is_available" = true)
  GROUP BY "t"."id";



CREATE OR REPLACE TRIGGER "order_status_changed" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."track_order_status_change"();



CREATE OR REPLACE TRIGGER "update_menu_item_variants_updated_at" BEFORE UPDATE ON "public"."menu_item_variants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_menu_items_updated_at" BEFORE UPDATE ON "public"."menu_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_restaurants_updated_at" BEFORE UPDATE ON "public"."restaurants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_menu_item_variant_id" FOREIGN KEY ("menu_item_variant_id") REFERENCES "public"."menu_item_variants"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."menu_categories"
    ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."menu_item_modifiers"
    ADD CONSTRAINT "menu_item_modifiers_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id");



ALTER TABLE ONLY "public"."menu_item_modifiers"
    ADD CONSTRAINT "menu_item_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers"("id");



ALTER TABLE ONLY "public"."menu_item_variants"
    ADD CONSTRAINT "menu_item_variants_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."modifiers"
    ADD CONSTRAINT "modifiers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."order_item_modifiers"
    ADD CONSTRAINT "order_item_modifiers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."staff_sessions"
    ADD CONSTRAINT "staff_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."topping_prices"
    ADD CONSTRAINT "topping_prices_menu_item_variant_id_fkey" FOREIGN KEY ("menu_item_variant_id") REFERENCES "public"."menu_item_variants"("id");



ALTER TABLE ONLY "public"."topping_prices"
    ADD CONSTRAINT "topping_prices_topping_id_fkey" FOREIGN KEY ("topping_id") REFERENCES "public"."toppings"("id");



ALTER TABLE ONLY "public"."toppings"
    ADD CONSTRAINT "toppings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



CREATE POLICY "Allow all operations on orders" ON "public"."orders" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can read available menu items" ON "public"."menu_items" FOR SELECT USING (("is_available" = true));



CREATE POLICY "Order items operations" ON "public"."order_items" USING (true) WITH CHECK (true);



CREATE POLICY "Restaurant operations" ON "public"."orders" USING (true) WITH CHECK (true);



CREATE POLICY "Restaurant staff access" ON "public"."customers" USING (("restaurant_id" IN ( SELECT "staff"."restaurant_id"
   FROM "public"."staff"
  WHERE ("staff"."id" = "auth"."uid"()))));



CREATE POLICY "Restaurant staff can manage menu items" ON "public"."menu_items" USING (("restaurant_id" IN ( SELECT "staff"."restaurant_id"
   FROM "public"."staff"
  WHERE ("staff"."id" = "auth"."uid"()))));



CREATE POLICY "Staff can manage orders based on role" ON "public"."orders" USING (("restaurant_id" IN ( SELECT "s"."restaurant_id"
   FROM "public"."staff" "s"
  WHERE (("s"."id" = "auth"."uid"()) AND ("s"."is_active" = true) AND ((("s"."permissions" ->> 'orders.view'::"text"))::boolean = true))))) WITH CHECK (("restaurant_id" IN ( SELECT "s"."restaurant_id"
   FROM "public"."staff" "s"
  WHERE (("s"."id" = "auth"."uid"()) AND ("s"."is_active" = true) AND ((("s"."permissions" ->> 'orders.create'::"text"))::boolean = true)))));



ALTER TABLE "public"."customer_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_item_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modifiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_item_modifiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."toppings" ENABLE ROW LEVEL SECURITY;




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



GRANT ALL ON FUNCTION "public"."increment_total_orders"("customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_total_orders"("customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_total_orders"("customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_order_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_order_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_order_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_customer_stats"("customer_id" "uuid", "order_total" numeric, "points_earned" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_customer_stats"("customer_id" "uuid", "order_total" numeric, "points_earned" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_customer_stats"("customer_id" "uuid", "order_total" numeric, "points_earned" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."customer_addresses" TO "anon";
GRANT ALL ON TABLE "public"."customer_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_transactions" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."menu_categories" TO "anon";
GRANT ALL ON TABLE "public"."menu_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_categories" TO "service_role";



GRANT ALL ON TABLE "public"."menu_item_modifiers" TO "anon";
GRANT ALL ON TABLE "public"."menu_item_modifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_item_modifiers" TO "service_role";



GRANT ALL ON TABLE "public"."menu_item_variants" TO "anon";
GRANT ALL ON TABLE "public"."menu_item_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_item_variants" TO "service_role";



GRANT ALL ON TABLE "public"."menu_items" TO "anon";
GRANT ALL ON TABLE "public"."menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_items" TO "service_role";



GRANT ALL ON TABLE "public"."menu_items_with_details" TO "anon";
GRANT ALL ON TABLE "public"."menu_items_with_details" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_items_with_details" TO "service_role";



GRANT ALL ON TABLE "public"."modifiers" TO "anon";
GRANT ALL ON TABLE "public"."modifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."modifiers" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_modifiers" TO "anon";
GRANT ALL ON TABLE "public"."order_item_modifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_modifiers" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."restaurants" TO "anon";
GRANT ALL ON TABLE "public"."restaurants" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurants" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_sessions" TO "anon";
GRANT ALL ON TABLE "public"."staff_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."topping_prices" TO "anon";
GRANT ALL ON TABLE "public"."topping_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."topping_prices" TO "service_role";



GRANT ALL ON TABLE "public"."toppings" TO "anon";
GRANT ALL ON TABLE "public"."toppings" TO "authenticated";
GRANT ALL ON TABLE "public"."toppings" TO "service_role";



GRANT ALL ON TABLE "public"."toppings_with_pricing" TO "anon";
GRANT ALL ON TABLE "public"."toppings_with_pricing" TO "authenticated";
GRANT ALL ON TABLE "public"."toppings_with_pricing" TO "service_role";









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

CREATE TABLE "shopper_list_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"list_id" text NOT NULL,
	"product_id" text,
	"name" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text,
	"category" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"checked_at" integer,
	"added_by" text NOT NULL,
	"created_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopper_list_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"list_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopper_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"household_id" text,
	"name" text NOT NULL,
	"kind" text DEFAULT 'personal' NOT NULL,
	"created_by" text NOT NULL,
	"archived_at" integer,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopper_products" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"household_id" text,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"category" text,
	"icon" text,
	"icon_asset_path" text,
	"barcode" text,
	"photo_path" text,
	"default_unit" text,
	"typical_price" integer,
	"on_hand_qty" text,
	"low_stock_threshold" text,
	"created_by" text NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopper_purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"household_id" text,
	"list_id" text,
	"list_item_id" text,
	"product_id" text,
	"name" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text,
	"price" integer,
	"currency" text,
	"purchased_by" text NOT NULL,
	"purchased_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopper_user_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"last_list_id" text,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shopper_list_shares_list_user_idx" ON "shopper_list_shares" USING btree ("list_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopper_products_owner_normalized_idx" ON "shopper_products" USING btree ("owner_user_id","normalized_name");
CREATE TABLE "expense_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '1' NOT NULL,
	"unit" varchar(50),
	"unit_price" numeric(10, 2),
	"total_price" numeric(10, 2) NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expense_items_expense_id" ON "expense_items" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "idx_expense_items_sort_order" ON "expense_items" USING btree ("expense_id","sort_order");
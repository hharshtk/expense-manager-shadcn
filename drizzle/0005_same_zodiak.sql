CREATE TYPE "public"."investment_type" AS ENUM('stock', 'mutual_fund', 'etf', 'bond', 'crypto', 'commodity', 'other');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('buy', 'sell', 'dividend', 'split', 'bonus');--> statement-breakpoint
CREATE TABLE "investment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"investment_id" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"price" numeric(15, 4) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"fees" numeric(15, 2) DEFAULT '0',
	"taxes" numeric(15, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"date" date NOT NULL,
	"time" varchar(8),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "investment_type" DEFAULT 'stock' NOT NULL,
	"exchange" varchar(50),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"total_quantity" numeric(15, 4) DEFAULT '0',
	"average_price" numeric(15, 4) DEFAULT '0',
	"current_price" numeric(15, 4),
	"total_invested" numeric(15, 2) DEFAULT '0',
	"current_value" numeric(15, 2),
	"total_gain_loss" numeric(15, 2),
	"total_gain_loss_percent" numeric(10, 2),
	"last_updated" timestamp,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_investment_transactions_user_id" ON "investment_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_investment_transactions_investment_id" ON "investment_transactions" USING btree ("investment_id");--> statement-breakpoint
CREATE INDEX "idx_investment_transactions_date" ON "investment_transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_investment_transactions_type" ON "investment_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_investments_user_id" ON "investments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_investments_symbol" ON "investments" USING btree ("symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_investments_user_symbol" ON "investments" USING btree ("user_id","symbol");
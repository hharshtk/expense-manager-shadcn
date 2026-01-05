CREATE TYPE "public"."alert_type" AS ENUM('price_above', 'price_below', 'percent_change');--> statement-breakpoint
CREATE TABLE "portfolio_holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"investment_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" varchar(50),
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"alert_type" "alert_type" NOT NULL,
	"target_price" numeric(15, 4) NOT NULL,
	"current_price" numeric(15, 4),
	"is_triggered" boolean DEFAULT false,
	"triggered_at" timestamp,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "investment_type" DEFAULT 'stock' NOT NULL,
	"exchange" varchar(50),
	"currency" varchar(3) DEFAULT 'USD',
	"target_price" numeric(15, 4),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "portfolio_id" integer;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "sector" varchar(100);--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "previous_close" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "day_change" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "day_change_percent" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "day_gain_loss" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portfolio_holdings_unique" ON "portfolio_holdings" USING btree ("portfolio_id","investment_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_holdings_portfolio_id" ON "portfolio_holdings" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_holdings_investment_id" ON "portfolio_holdings" USING btree ("investment_id");--> statement-breakpoint
CREATE INDEX "idx_portfolios_user_id" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portfolios_user_name" ON "portfolios" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "idx_price_alerts_user_id" ON "price_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_price_alerts_symbol" ON "price_alerts" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "idx_price_alerts_is_active" ON "price_alerts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_watchlist_user_id" ON "watchlist" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_watchlist_user_symbol" ON "watchlist" USING btree ("user_id","symbol");--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_investments_portfolio_id" ON "investments" USING btree ("portfolio_id");
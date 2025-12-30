import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Load environment variables
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function setupDatabase() {
  try {
    console.log("🔧 Running database migrations...");

    // Run migrations from the drizzle folder
    await migrate(db, { migrationsFolder: "./drizzle" });

    console.log("✅ Database migrations completed successfully!");
    console.log("");
    console.log("📋 Available tables:");
    console.log("   - users (user accounts with auth support)");
    console.log("   - oauth_accounts (OAuth provider links)");
    console.log("   - sessions (user sessions)");
    console.log("   - financial_accounts (bank accounts, wallets, etc.)");
    console.log("   - categories (expense/income categories)");
    console.log("   - payment_methods (payment methods)");
    console.log("   - expenses (expense/income transactions)");
    console.log("   - budgets (budget tracking)");
    console.log("   - tags (custom tags)");
    console.log("   - expense_tags (expense-tag relationships)");
    console.log("   - savings_goals (savings targets)");
    console.log("");
    console.log("🚀 Your expense management database is ready!");
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase();

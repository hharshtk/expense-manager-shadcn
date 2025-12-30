import { config } from "dotenv";
import { Pool } from "pg";

// Load environment variables
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  try {
    console.log("🔧 Setting up database...");

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Users table created successfully");

    // Make password_hash nullable for OAuth users
    await pool
      .query(`
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    `)
      .catch(() => {
        // Ignore error if column is already nullable
      });

    console.log("✅ Users table updated for OAuth support");

    // Create sessions table for managing user sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Sessions table created successfully");

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);

    console.log("✅ Database setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase();

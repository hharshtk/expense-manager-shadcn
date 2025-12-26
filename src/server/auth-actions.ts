"use server";

import { redirect } from "next/navigation";

import { z } from "zod";

import { clearAuthCookie, generateToken, hashPassword, setAuthCookie, verifyPassword } from "@/lib/auth";
import { pool } from "@/lib/db";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export interface AuthResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Login user with email and password
 */
export async function loginUser(data: z.infer<typeof loginSchema>): Promise<AuthResult> {
  try {
    // Validate input
    const validatedData = loginSchema.parse(data);

    // Find user by email
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [validatedData.email]);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password_hash);

    if (!isValidPassword) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Set auth cookie
    await setAuthCookie(token);

    return {
      success: true,
      message: "Login successful!",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    console.error("Login error:", error);
    return {
      success: false,
      message: "An error occurred during login. Please try again.",
    };
  }
}

/**
 * Register a new user
 */
export async function registerUser(data: z.infer<typeof registerSchema>): Promise<AuthResult> {
  try {
    // Validate input
    const validatedData = registerSchema.parse(data);

    // Check if passwords match
    if (validatedData.password !== validatedData.confirmPassword) {
      return {
        success: false,
        message: "Passwords do not match.",
        errors: {
          confirmPassword: ["Passwords do not match."],
        },
      };
    }

    // Check if user already exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [validatedData.email]);

    if (existingUser.rows.length > 0) {
      return {
        success: false,
        message: "Email already registered.",
        errors: {
          email: ["This email is already registered."],
        },
      };
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Create user
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [validatedData.email, passwordHash, validatedData.name],
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Set auth cookie
    await setAuthCookie(token);

    return {
      success: true,
      message: "Registration successful!",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    console.error("Registration error:", error);
    return {
      success: false,
      message: "An error occurred during registration. Please try again.",
    };
  }
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  await clearAuthCookie();
  redirect("/auth/v2/login");
}

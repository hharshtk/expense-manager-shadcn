"use server";

import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { clearAuthCookie, generateToken, hashPassword, setAuthCookie, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialAccounts, users } from "@/lib/schema";

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
    const user = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // Verify password
    const isValidPassword = user.passwordHash ? await verifyPassword(validatedData.password, user.passwordHash) : false;

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
      name: user.name ?? undefined,
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
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    if (existingUser) {
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
    const [newUser] = await db
      .insert(users)
      .values({
        email: validatedData.email,
        passwordHash: passwordHash,
        name: validatedData.name,
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    // Create default Cash account for the new user
    await db.insert(financialAccounts).values({
      userId: newUser.id,
      name: "Cash",
      type: "cash",
      currency: "USD",
      initialBalance: "0",
      currentBalance: "0",
      color: "#22c55e", // Green color for cash
      icon: "wallet",
      isActive: true,
      includeInTotal: true,
      isDefault: true,
    });

    // Generate JWT token
    const token = await generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name ?? undefined,
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

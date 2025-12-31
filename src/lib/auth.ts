import { cookies } from "next/headers";

import * as bcrypt from "bcryptjs";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
const AUTH_COOKIE_NAME = "auth-token";

export interface UserPayload {
  id: number;
  email: string;
  name?: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export async function generateToken(user: UserPayload): Promise<string> {
  const token = await new jose.SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);

    // Validate that the payload contains required fields
    if (typeof payload.id === "number" && typeof payload.email === "string") {
      return {
        id: payload.id,
        email: payload.email,
        name: typeof payload.name === "string" ? payload.name : undefined,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current authenticated user from cookies
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-nextauth";

/**
 * Get the current authenticated user from cookies or NextAuth session
 */
export async function getCurrentUser(): Promise<UserPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (token) {
      const verified = await verifyToken(token);
      if (verified) return verified;
    }

    // Fallback to NextAuth session (for OAuth users)
    const session = await getServerSession(authOptions);
    if (session?.user?.id && session?.user?.email) {
      return {
        id: parseInt(session.user.id),
        email: session.user.email,
        name: session.user.name || undefined,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

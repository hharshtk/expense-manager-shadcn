import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { generateToken, hashPassword } from "@/lib/auth";
import { pool as db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await db.query("SELECT id, email FROM users WHERE email = $1", [user.email]);

          if (existingUser.rows.length === 0) {
            console.log("[NextAuth] Creating new user:", user.email);
            // Create new user
            const result = await db.query(
              "INSERT INTO users (email, name, password_hash, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id",
              [user.email, user.name, ""], // Empty password for OAuth users
            );
            user.id = result.rows[0].id.toString();
          } else {
            user.id = existingUser.rows[0].id.toString();
          }

          return true;
        } catch (error) {
          console.error("[NextAuth] Error during Google sign-in:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/v2/login",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  debug: process.env.NODE_ENV === "development",
  useSecureCookies: process.env.NODE_ENV === "production",
};

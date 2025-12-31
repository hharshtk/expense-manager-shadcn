import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@/lib/db";
import { financialAccounts, users } from "@/lib/schema";

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
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, user.email!),
            columns: { id: true, email: true },
          });

          if (!existingUser) {
            console.log("[NextAuth] Creating new user:", user.email);
            // Create new user
            const [newUser] = await db
              .insert(users)
              .values({
                email: user.email!,
                name: user.name,
                passwordHash: "", // Empty password for OAuth users
              })
              .returning({ id: users.id });
            user.id = newUser.id.toString();

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
            console.log("[NextAuth] Created default Cash account for user:", user.email);
          } else {
            user.id = existingUser.id.toString();
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

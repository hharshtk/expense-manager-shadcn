"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";

import { getCurrentUser } from "@/lib/auth";
import { authOptions } from "@/lib/auth-nextauth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

async function getAuthenticatedUserId(): Promise<number | null> {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        return Number.parseInt(session.user.id, 10);
    }

    const customUser = await getCurrentUser();
    if (customUser?.id) {
        return customUser.id;
    }

    return null;
}

export type UserSettings = {
    defaultCurrency: string;
    timezone: string;
    locale: string;
    dateFormat: string;
};

export type UserSettingsFormData = Partial<UserSettings>;

/**
 * Get current user settings
 */
export async function getUserSettings(): Promise<ActionResult<UserSettings>> {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        const [user] = await db
            .select({
                defaultCurrency: users.defaultCurrency,
                timezone: users.timezone,
                locale: users.locale,
                dateFormat: users.dateFormat,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            return { success: false, error: "User not found" };
        }

        return {
            success: true,
            data: {
                defaultCurrency: user.defaultCurrency || "USD",
                timezone: user.timezone || "UTC",
                locale: user.locale || "en-US",
                dateFormat: user.dateFormat || "MM/DD/YYYY",
            },
        };
    } catch (error) {
        console.error("Failed to fetch user settings:", error);
        return { success: false, error: "Failed to fetch user settings" };
    }
}

/**
 * Update user settings
 */
export async function updateUserSettings(
    formData: UserSettingsFormData,
): Promise<ActionResult<UserSettings>> {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        const updateData: Partial<typeof users.$inferInsert> = {
            updatedAt: new Date(),
        };

        if (formData.defaultCurrency !== undefined) updateData.defaultCurrency = formData.defaultCurrency;
        if (formData.timezone !== undefined) updateData.timezone = formData.timezone;
        if (formData.locale !== undefined) updateData.locale = formData.locale;
        if (formData.dateFormat !== undefined) updateData.dateFormat = formData.dateFormat;

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning({
                defaultCurrency: users.defaultCurrency,
                timezone: users.timezone,
                locale: users.locale,
                dateFormat: users.dateFormat,
            });

        if (!updatedUser) {
            return { success: false, error: "Failed to update settings" };
        }

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/overview");
        revalidatePath("/dashboard/expense");
        revalidatePath("/dashboard/accounts");

        return {
            success: true,
            data: {
                defaultCurrency: updatedUser.defaultCurrency || "USD",
                timezone: updatedUser.timezone || "UTC",
                locale: updatedUser.locale || "en-US",
                dateFormat: updatedUser.dateFormat || "MM/DD/YYYY",
            },
        };
    } catch (error) {
        console.error("Failed to update user settings:", error);
        return { success: false, error: "Failed to update user settings" };
    }
}

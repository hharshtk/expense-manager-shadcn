"use server";

import { revalidatePath } from "next/cache";

import { and, eq, isNull } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth"; // Assuming this exists or similar
import { db } from "@/lib/db";
import { categories, type NewCategory } from "@/lib/schema";

// Common icons mapping for seeding
const DEFAULT_CATEGORIES = [
  {
    name: "Vehicle",
    icon: "car",
    color: "#3b82f6", // blue-500
    subcategories: [
      { name: "Leasing", icon: "file-signature", color: "#60a5fa" },
      { name: "Vehicle insurance", icon: "shield-check", color: "#60a5fa" },
      { name: "Rentals", icon: "key", color: "#60a5fa" },
      { name: "Vehicle maintenance", icon: "wrench", color: "#60a5fa" },
      { name: "Parking", icon: "parking-circle", color: "#60a5fa" },
      { name: "Fuel", icon: "fuel", color: "#60a5fa" },
    ],
  },
  {
    name: "Housing",
    icon: "home",
    color: "#ef4444", // red-500
    subcategories: [
      { name: "Rent", icon: "home", color: "#f87171" },
      { name: "Mortgage", icon: "landmark", color: "#f87171" },
      { name: "Utilities", icon: "plug", color: "#f87171" },
      { name: "Maintenance", icon: "hammer", color: "#f87171" },
    ],
  },
  {
    name: "Food",
    icon: "utensils",
    color: "#22c55e", // green-500
    subcategories: [
      { name: "Groceries", icon: "shopping-cart", color: "#4ade80" },
      { name: "Dining Out", icon: "coffee", color: "#4ade80" },
    ],
  },
  {
    name: "Transport",
    icon: "bus",
    color: "#eab308", // yellow-500
    subcategories: [
      { name: "Public Transit", icon: "bus-front", color: "#facc15" },
      { name: "Taxi/Ride Share", icon: "car-taxi-front", color: "#facc15" },
    ],
  },
  {
    name: "Entertainment",
    icon: "film",
    color: "#a855f7", // purple-500
    subcategories: [
      { name: "Movies", icon: "film", color: "#c084fc" },
      { name: "Games", icon: "gamepad-2", color: "#c084fc" },
      { name: "Subscriptions", icon: "credit-card", color: "#c084fc" },
    ],
  },
  {
    name: "Health",
    icon: "heart-pulse",
    color: "#ec4899", // pink-500
    subcategories: [
      { name: "Medical", icon: "stethoscope", color: "#f472b6" },
      { name: "Dental", icon: "smile", color: "#f472b6" },
      { name: "Pharmacy", icon: "pill", color: "#f472b6" },
    ],
  },
  {
    name: "Income",
    icon: "wallet",
    type: "income" as const,
    color: "#10b981", // emerald-500
    subcategories: [
      { name: "Salary", icon: "banknote", color: "#34d399" },
      { name: "Bonus", icon: "gift", color: "#34d399" },
      { name: "Interest", icon: "percent", color: "#34d399" },
      { name: "Other", icon: "plus", color: "#34d399" },
    ],
  },
];

export async function getCategories() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const allCategories = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
    orderBy: (categories, { asc }) => [asc(categories.name)],
  });

  // Build tree
  const rootCategories = allCategories
    .filter((c) => !c.parentId)
    .map((root) => ({
      ...root,
      subcategories: allCategories.filter((c) => c.parentId === root.id),
    }));

  return rootCategories;
}

export async function createCategory(data: {
  name: string;
  type: "expense" | "income";
  parentId?: number | null;
  icon?: string;
  color?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const [newCat] = await db
    .insert(categories)
    .values({
      userId: user.id,
      name: data.name,
      type: data.type,
      parentId: data.parentId ?? null,
      icon: data.icon,
      color: data.color,
    })
    .returning();

  revalidatePath("/dashboard/categories");
  return newCat;
}

export async function updateCategory(
  id: number,
  data: {
    name?: string;
    icon?: string;
    color?: string;
    parentId?: number | null;
  },
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const [updated] = await db
    .update(categories)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .returning();

  revalidatePath("/dashboard/categories");
  return updated;
}

export async function deleteCategory(id: number) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Delete category (cascade should handle subcategories/expenses if configured,
  // but let's check schema. Schema has:
  // parentId: integer("parent_id"), // Self-reference for subcategories
  // no onDelete cascade on parentId in the table definition I saw?
  // Wait, let me check schema again.
  // schema says: parentId: integer("parent_id") -- NO references constraint in the column definition shown?
  // Actually, I saw:
  // (table) => [index("idx_categories_user_id").on(table.userId), index("idx_categories_parent_id").on(table.parentId)],
  // AND in relations:
  // parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "subcategories" })

  // Checking schema.ts again to be sure about foreign key on parentId:
  // Line 161: parentId: integer("parent_id"), // Self-reference for subcategories
  // It DOES NOT have .references(() => categories.id) attached inline.
  // This means I should manually handle children deletion or rely on app logic.
  // Best practice: Delete children first or recursively.

  // First delete subcategories
  await db.delete(categories).where(and(eq(categories.parentId, id), eq(categories.userId, user.id)));

  // Then delete the category
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, user.id)));

  revalidatePath("/dashboard/categories");
}

export async function seedCategories() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check if categories exist
  const existing = await db.query.categories.findFirst({
    where: eq(categories.userId, user.id),
  });

  if (existing) {
    return { seeded: false, message: "Categories already exist" };
  }

  // Insert sequentially to ensure parents exist before children
  for (const cat of DEFAULT_CATEGORIES) {
    const [parent] = await db
      .insert(categories)
      .values({
        userId: user.id,
        name: cat.name,
        type: cat.type || "expense",
        icon: cat.icon,
        color: cat.color,
      })
      .returning();

    if (cat.subcategories && cat.subcategories.length > 0) {
      await db.insert(categories).values(
        cat.subcategories.map((sub) => ({
          userId: user.id,
          name: sub.name,
          type: (cat.type || "expense") as "expense" | "income",
          parentId: parent.id,
          icon: sub.icon,
          color: sub.color,
        })),
      );
    }
  }

  // revalidatePath("/dashboard/categories"); // Cannot revalidate during render
  return { seeded: true, message: "Categories seeded successfully" };
}

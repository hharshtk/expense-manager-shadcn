import type { Metadata } from "next";

import { getCategories, seedCategories } from "@/actions/categories";
import { CategoryDialog } from "@/components/categories/category-dialog";
import { CategoryList } from "@/components/categories/category-list";

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage your expense and income categories",
};

export default async function CategoriesPage() {
  let categories = await getCategories();

  if (categories.length === 0) {
    await seedCategories();
    categories = await getCategories();
  }

  // Flatten categories for the "Parent" select options (only top level needed usually, but logic in dialog handles it)
  // Actually, getCategories returns a tree.
  // We need a flat list for the `CategoryDialog` (which expects `categories` prop for parent selection).
  // But `CategoryDialog` inside `CategoryList` mostly uses it for edit (where parent is set) or add sub (where parent is set).
  // The TOP LEVEL "Add Category" button needs the list of potential parents if we want to allow selecting a parent there?
  // Usually "Add Category" button creates a top level one, but user might want to select a parent.
  // So I should pass the current top-level categories as potential parents to the dialog.

  // My `getCategories` returns `(Category & { subcategories: Category[] })[]`.
  // `CategoryDialog` expects `Category[]`.
  // The types match mostly, except for invalid extra props? No, intersection is fine.

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your expense and income categories.</p>
        </div>
        <CategoryDialog categories={categories} />
      </div>

      <CategoryList categories={categories} />
    </div>
  );
}

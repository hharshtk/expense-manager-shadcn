"use client";

import * as React from "react";

import { ChevronRight, ChevronsDownUp, ChevronsUpDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCategory } from "@/actions/categories";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { icons } from "@/components/ui/icon-picker";
import type { Category } from "@/lib/schema";
import { cn } from "@/lib/utils";

import { CategoryDialog } from "./category-dialog";

// Define the type for the tree structure returned by getCategories
type CategoryWithChildren = Category & { subcategories: Category[] };

interface CategoryListProps {
  categories: CategoryWithChildren[];
}

export function CategoryList({ categories }: CategoryListProps) {
  const [openIds, setOpenIds] = React.useState<number[]>([]);

  const expandableCategories = categories.filter((c) => c.subcategories.length > 0);
  const allExpanded = expandableCategories.length > 0 && openIds.length === expandableCategories.length;

  const toggleAll = () => {
    if (allExpanded) {
      setOpenIds([]);
    } else {
      setOpenIds(expandableCategories.map((c) => c.id));
    }
  };

  const handleOpenChange = (id: number, open: boolean) => {
    setOpenIds((prev) => (open ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  // Separate by type
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your expense and income categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} className="h-8 gap-2">
            {allExpanded ? (
              <>
                <ChevronsDownUp className="size-4" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronsUpDown className="size-4" />
                Expand All
              </>
            )}
          </Button>
          <CategoryDialog categories={categories} />
        </div>
      </div>

      <CategorySection
        title="Expense Categories"
        categories={expenseCategories}
        openIds={openIds}
        onOpenChange={handleOpenChange}
      />
      <CategorySection
        title="Income Categories"
        categories={incomeCategories}
        openIds={openIds}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}

function CategorySection({
  title,
  categories,
  openIds,
  onOpenChange,
}: {
  title: string;
  categories: CategoryWithChildren[];
  openIds: number[];
  onOpenChange: (id: number, open: boolean) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {/* Changed from grid to simple stack */}
      <div className="flex flex-col gap-2">
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            isOpen={openIds.includes(category.id)}
            onOpenChange={(open) => onOpenChange(category.id, open)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  isOpen,
  onOpenChange,
}: {
  category: CategoryWithChildren;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const hasSubcategories = category.subcategories.length > 0;

  const Icon =
    category.icon && icons[category.icon as keyof typeof icons] ? icons[category.icon as keyof typeof icons] : null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onOpenChange}
      className="rounded-md border bg-card text-card-foreground shadow-sm"
    >
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
          <CollapsibleTrigger asChild disabled={!hasSubcategories}>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 shrink-0 transition-transform duration-200",
                !hasSubcategories && "opacity-0 cursor-default",
                isOpen && "rotate-90",
              )}
            >
              <ChevronRight className="size-4" />
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2 font-medium">
            {Icon ? <Icon className="size-5 text-muted-foreground" /> : null}
            <span>{category.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* + Button for adding subcategory */}
          <CategoryDialog
            parentId={category.id}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Plus className="size-4" />
              </Button>
            }
          />
          <CategoryActions category={category} />
        </div>
      </div>

      <CollapsibleContent>
        <div className="ml-11 mr-2 mb-2 space-y-1 border-l pl-2">
          {category.subcategories.map((sub) => (
            <SubCategoryItem key={sub.id} subcategory={sub} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SubCategoryItem({ subcategory }: { subcategory: Category }) {
  const Icon =
    subcategory.icon && icons[subcategory.icon as keyof typeof icons]
      ? icons[subcategory.icon as keyof typeof icons]
      : null;

  const handleDelete = async () => {
    try {
      await deleteCategory(subcategory.id);
      toast.success("Subcategory deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="group flex items-center justify-between rounded-md py-1 px-2 hover:bg-muted/50 text-sm">
      <div className="flex items-center gap-2">
        {/* Small dot or just the icon? Icon is better if available */}
        {Icon ? (
          <Icon className="size-4 text-muted-foreground" />
        ) : (
          <div className="size-1.5 rounded-full bg-muted-foreground" />
        )}
        <span>{subcategory.name}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <CategoryDialog
          category={subcategory}
          trigger={
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Pencil className="size-3" />
            </Button>
          }
        />
        <ConfirmDelete
          onConfirm={handleDelete}
          trigger={
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive">
              <Trash2 className="size-3" />
            </Button>
          }
        />
      </div>
    </div>
  );
}

function CategoryActions({ category }: { category: Category }) {
  const handleDelete = async () => {
    try {
      await deleteCategory(category.id);
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <CategoryDialog
          category={category}
          trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>}
          open={undefined}
          onOpenChange={undefined} // rely on dialog internal
        />
        <ConfirmDelete
          onConfirm={handleDelete}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
              Delete
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConfirmDelete({ onConfirm, trigger }: { onConfirm: () => void; trigger: React.ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the category and unlink it from any expenses.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

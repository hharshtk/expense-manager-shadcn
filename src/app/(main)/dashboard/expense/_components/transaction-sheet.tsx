import * as React from "react";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { icons } from "@/components/ui/icon-picker";
import { getCurrencySymbol } from "@/lib/currency";
import type { UserSettings } from "@/server/user-settings-actions";
import { getCategories } from "@/actions/categories";

import { updateExpense } from "../_actions/expense-actions";
import type { Transaction, ExpenseItem } from "./schema";

type TransactionSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction | null;
    onUpdate: (item: Transaction) => void;
    userSettings: UserSettings;
};

// Define category type for local state
type CategoryOption = { id: number; name: string; type: "expense" | "income"; icon: string | null; color: string | null; subcategories?: CategoryOption[] };

export function TransactionSheet({ open, onOpenChange, transaction: item, onUpdate, userSettings }: TransactionSheetProps) {
    const isMobile = useIsMobile();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [categories, setCategories] = React.useState<CategoryOption[]>([]);

    const [form, setForm] = React.useState({
        type: "expense" as "expense" | "income",
        amount: "",
        description: "",
        date: "",
        notes: "",
        tags: "",
        category: "",
        expenseItems: [] as Array<{
            name: string;
            quantity: string;
            unit: string;
            unitPrice: string;
            totalPrice: string;
            notes: string;
        }>,
    });

    React.useEffect(() => {
        if (item) {
            setForm({
                type: item.type,
                amount: item.amount,
                description: item.description || "",
                date: item.date,
                notes: item.notes || "",
                tags: item.tags || "",
                category: item.category ? item.category.id.toString() : "",
                expenseItems: item.expenseItems?.map((ei) => ({
                    name: ei.name,
                    quantity: ei.quantity,
                    unit: ei.unit || "",
                    unitPrice: ei.unitPrice || "",
                    totalPrice: ei.totalPrice,
                    notes: ei.notes || "",
                })) || [],
            });
        }
    }, [item]);

    React.useEffect(() => {
        if (open) {
            getCategories().then((data) => {
                setCategories(data);
            });
        }
    }, [open]);

    // Find selected category object for display
    const selectedCategory = React.useMemo(() => {
        const catId = Number.parseInt(form.category);
        for (const parent of categories) {
            if (parent.id === catId) return parent;
            if (parent.subcategories) {
                const sub = parent.subcategories.find((s) => s.id === catId);
                if (sub) return sub;
            }
        }
        // Fallback to item category if not yet loaded or found
        if (item?.category && item.category.id === catId) return item.category;
        return null;
    }, [categories, form.category, item?.category]);

    // Expense items handlers
    const addExpenseItem = () => {
        setForm((prev) => ({
            ...prev,
            expenseItems: [
                ...prev.expenseItems,
                {
                    name: "",
                    quantity: "1",
                    unit: "",
                    unitPrice: "",
                    totalPrice: "",
                    notes: "",
                },
            ],
        }));
    };

    const updateExpenseItem = (index: number, field: string, value: string) => {
        setForm((prev) => ({
            ...prev,
            expenseItems: prev.expenseItems.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            ),
        }));
    };

    const removeExpenseItem = (index: number) => {
        setForm((prev) => ({
            ...prev,
            expenseItems: prev.expenseItems.filter((_, i) => i !== index),
        }));
    };

    if (!item) return null;

    const amount = Number.parseFloat(form.amount || "0");
    const currencySymbol = getCurrencySymbol(userSettings.defaultCurrency);

    const formattedAmount = new Intl.NumberFormat(userSettings.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    // Calculate total of expense items
    const expenseItemsTotal = form.expenseItems.reduce((total, item) => {
        const itemTotal = Number.parseFloat(item.totalPrice || "0");
        return total + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);

    const parentAmount = Number.parseFloat(form.amount || "0");
    const isItemsTotalValid = expenseItemsTotal <= parentAmount;

    const canSubmit = form.description.trim().length > 0 && form.amount.trim().length > 0 && !isSubmitting && form.expenseItems.every(item => item.name.trim().length > 0 && item.totalPrice.trim().length > 0) && isItemsTotalValid;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Validate expense items
            const invalidItems = form.expenseItems.filter(item => 
                !item.name.trim() || !item.totalPrice.trim()
            );
            
            if (invalidItems.length > 0) {
                toast.error("Please fill in all required fields for expense items (name and total price)");
                setIsSubmitting(false);
                return;
            }

            // Validate that expense items total doesn't exceed parent amount
            if (!isItemsTotalValid) {
                toast.error(`Total of expense items ($${expenseItemsTotal.toFixed(2)}) cannot exceed the transaction amount ($${parentAmount.toFixed(2)})`);
                setIsSubmitting(false);
                return;
            }

            const result = await updateExpense(item.id, {
                type: form.type,
                amount: form.amount,
                description: form.description,
                date: form.date,
                notes: form.notes || undefined,
                tags: form.tags || undefined,
                category: form.category,
                isConfirmed: true,
                expenseItems: form.expenseItems.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit || undefined,
                    unitPrice: item.unitPrice && item.unitPrice.trim() !== "" ? item.unitPrice : undefined,
                    totalPrice: item.totalPrice,
                    notes: item.notes || undefined,
                })),
            });

            if (result.success) {
                toast.success("Transaction updated successfully");
                onUpdate(result.data as Transaction);
                onOpenChange(false);
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error("Failed to update transaction");
        } finally {
            setIsSubmitting(false);
        }
    };

    const CategoryIcon = selectedCategory?.icon && icons[selectedCategory.icon as keyof typeof icons]
        ? icons[selectedCategory.icon as keyof typeof icons]
        : null;

    return (
        <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Transaction Details</DrawerTitle>
                    <DrawerDescription>Edit transaction details</DrawerDescription>
                </DrawerHeader>

                <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
                    {/* Top summary section */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-medium">Amount</span>
                            <div className="text-2xl font-bold font-mono tracking-tight flex items-center gap-1">
                                <span>{form.type === "expense" ? "-" : ""}</span>
                                <span>{currencySymbol}</span>
                                <span>{formattedAmount}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-xs font-medium">
                            {selectedCategory ? (
                                <>
                                    {CategoryIcon && <CategoryIcon className="size-3 text-muted-foreground" />}
                                    <span>{selectedCategory.name}</span>
                                </>
                            ) : <span className="text-muted-foreground">Uncategorized</span>}
                        </div>
                    </div>

                    <Separator />

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={form.description}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={form.type}
                                onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as "expense" | "income" }))}
                            >
                                <SelectTrigger id="type" className="w-full">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                            "w-full justify-between font-normal",
                                            !form.category && "text-muted-foreground"
                                        )}
                                    >
                                        {selectedCategory ? (
                                            <div className="flex items-center gap-2">
                                                {CategoryIcon && <CategoryIcon className="size-4 text-muted-foreground" />}
                                                <span>{selectedCategory.name}</span>
                                            </div>
                                        ) : "Select category"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search category..." />
                                        <CommandList className="max-h-[300px] overflow-y-auto">
                                            <CommandEmpty>No category found.</CommandEmpty>
                                            {categories
                                                .filter(c => c.type === form.type)
                                                .map((parent) => {
                                                    const Icon = parent.icon && icons[parent.icon as keyof typeof icons] ? icons[parent.icon as keyof typeof icons] : null;
                                                    return (
                                                        <CommandGroup key={parent.id}>
                                                            <CommandItem
                                                                value={parent.name}
                                                                onSelect={() => {
                                                                    setForm((prev) => ({ ...prev, category: parent.id.toString() }));
                                                                }}
                                                                className="font-medium"
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        form.category === parent.id.toString() ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {Icon ? <Icon className="mr-2 size-4 text-muted-foreground" /> : null}
                                                                {parent.name}
                                                            </CommandItem>
                                                            {parent.subcategories?.map((sub) => {
                                                                const SubIcon = sub.icon && icons[sub.icon as keyof typeof icons] ? icons[sub.icon as keyof typeof icons] : null;
                                                                return (
                                                                    <CommandItem
                                                                        key={sub.id}
                                                                        value={sub.name}
                                                                        onSelect={() => {
                                                                            setForm((prev) => ({ ...prev, category: sub.id.toString() }));
                                                                        }}
                                                                        className="pl-8"
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                form.category === sub.id.toString() ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {SubIcon ? <SubIcon className="mr-2 size-4 text-muted-foreground" /> : null}
                                                                        {sub.name}
                                                                    </CommandItem>
                                                                )
                                                            })}
                                                        </CommandGroup>
                                                    )
                                                })}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="date">Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !form.date && "text-muted-foreground",
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {form.date ? format(new Date(form.date), "dd-MMM-yyyy") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={form.date ? new Date(form.date) : undefined}
                                            onSelect={(date) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    date: date ? format(date, "yyyy-MM-dd") : "",
                                                }))
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="amount">Amount</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                                id="notes"
                                value={form.notes}
                                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <Label htmlFor="tags">Tags</Label>
                            <Input
                                id="tags"
                                value={form.tags}
                                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                                placeholder="e.g. work, personal, urgent (comma-separated)"
                            />
                        </div>

                        {/* Expense Items Section */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <Label>Items</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addExpenseItem}
                                    className="h-8"
                                >
                                    Add Item
                                </Button>
                            </div>

                            {form.expenseItems.length > 0 && (
                                <div className="space-y-3">
                                    {form.expenseItems.map((item, index) => (
                                        <div key={index} className="rounded-lg border p-3 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-medium">Item {index + 1}</Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeExpenseItem(index)}
                                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                >
                                                    ×
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-2">
                                                    <Label htmlFor={`item-name-${index}`} className="text-xs">
                                                        Name *
                                                    </Label>
                                                    <Input
                                                        id={`item-name-${index}`}
                                                        value={item.name}
                                                        onChange={(e) => updateExpenseItem(index, "name", e.target.value)}
                                                        placeholder="e.g., Tomatoes"
                                                        className={`h-8 ${!item.name.trim() ? 'border-destructive' : ''}`}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <Label htmlFor={`item-quantity-${index}`} className="text-xs">
                                                        Quantity
                                                    </Label>
                                                    <Input
                                                        id={`item-quantity-${index}`}
                                                        type="number"
                                                        step="0.001"
                                                        value={item.quantity}
                                                        onChange={(e) => updateExpenseItem(index, "quantity", e.target.value)}
                                                        placeholder="1"
                                                        className="h-8"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="flex flex-col gap-2">
                                                    <Label htmlFor={`item-unit-${index}`} className="text-xs">
                                                        Unit
                                                    </Label>
                                                    <Input
                                                        id={`item-unit-${index}`}
                                                        value={item.unit}
                                                        onChange={(e) => updateExpenseItem(index, "unit", e.target.value)}
                                                        placeholder="kg, lbs, pieces"
                                                        className="h-8"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <Label htmlFor={`item-unit-price-${index}`} className="text-xs">
                                                        Unit Price
                                                    </Label>
                                                    <Input
                                                        id={`item-unit-price-${index}`}
                                                        type="number"
                                                        step="0.01"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateExpenseItem(index, "unitPrice", e.target.value)}
                                                        placeholder="0.00"
                                                        className="h-8"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <Label htmlFor={`item-total-price-${index}`} className="text-xs">
                                                        Total Price *
                                                    </Label>
                                                    <Input
                                                        id={`item-total-price-${index}`}
                                                        type="number"
                                                        step="0.01"
                                                        value={item.totalPrice}
                                                        onChange={(e) => updateExpenseItem(index, "totalPrice", e.target.value)}
                                                        placeholder="0.00"
                                                        className={`h-8 ${!item.totalPrice.trim() ? 'border-destructive' : ''}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor={`item-notes-${index}`} className="text-xs">
                                                    Notes
                                                </Label>
                                                <Input
                                                    id={`item-notes-${index}`}
                                                    value={item.notes}
                                                    onChange={(e) => updateExpenseItem(index, "notes", e.target.value)}
                                                    placeholder="Optional notes"
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Expense Items Summary */}
                                    <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">Items Total:</span>
                                            <span className={`font-medium ${!isItemsTotalValid ? 'text-destructive' : 'text-green-600'}`}>
                                                {currencySymbol}{expenseItemsTotal.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Transaction Amount:</span>
                                            <span className="font-medium">{currencySymbol}{parentAmount.toFixed(2)}</span>
                                        </div>
                                        {!isItemsTotalValid && (
                                            <div className="text-xs text-destructive font-medium">
                                                ⚠️ Items total exceeds transaction amount by {currencySymbol}{(expenseItemsTotal - parentAmount).toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DrawerFooter>
                    <Button disabled={!canSubmit} onClick={handleSubmit}>
                        {isSubmitting ? "Saving..." : "Save changes"}
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

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
import type { Transaction } from "./schema";

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
        category: "",
    });

    React.useEffect(() => {
        if (item) {
            setForm({
                type: item.type,
                amount: item.amount,
                description: item.description || "",
                date: item.date,
                notes: item.notes || "",
                category: item.category ? item.category.id.toString() : "",
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

    if (!item) return null;

    const amount = Number.parseFloat(form.amount || "0");
    const currencySymbol = getCurrencySymbol(userSettings.defaultCurrency);

    const formattedAmount = new Intl.NumberFormat(userSettings.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    const canSubmit = form.description.trim().length > 0 && form.amount.trim().length > 0 && !isSubmitting;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const result = await updateExpense(item.id, {
                type: form.type,
                amount: form.amount,
                description: form.description,
                date: form.date,
                notes: form.notes || undefined,
                category: form.category,
                isConfirmed: true,
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

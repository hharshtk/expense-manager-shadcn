"use client";

import * as React from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FinancialAccount } from "@/lib/schema";

import { createAccount } from "../_actions/account-actions";

const accountTypes = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank Account" },
    { value: "credit_card", label: "Credit Card" },
    { value: "debit_card", label: "Debit Card" },
    { value: "digital_wallet", label: "Digital Wallet" },
    { value: "investment", label: "Investment" },
    { value: "loan", label: "Loan" },
    { value: "other", label: "Other" },
] as const;

const accountColors = [
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#14b8a6", // Teal
    "#3b82f6", // Blue
    "#64748b", // Slate
];

type CreateAccountDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (account: FinancialAccount) => void;
    children?: React.ReactNode;
};

export function CreateAccountDialog({ open, onOpenChange, onSuccess, children }: CreateAccountDialogProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [form, setForm] = React.useState<{
        name: string;
        type: "cash" | "bank" | "credit_card" | "debit_card" | "digital_wallet" | "investment" | "loan" | "other";
        currency: string;
        initialBalance: string;
        creditLimit: string;
        color: string;
        notes: string;
    }>({
        name: "",
        type: "bank",
        currency: "USD",
        initialBalance: "",
        creditLimit: "",
        color: accountColors[0],
        notes: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error("Account name is required");
            return;
        }

        setIsSubmitting(true);
        const result = await createAccount({
            name: form.name.trim(),
            type: form.type,
            currency: form.currency,
            initialBalance: form.initialBalance || "0",
            creditLimit: form.type === "credit_card" && form.creditLimit ? form.creditLimit : undefined,
            color: form.color,
            notes: form.notes.trim() || undefined,
        });

        if (result.success) {
            toast.success("Account created successfully");
            setForm({
                name: "",
                type: "bank",
                currency: "USD",
                initialBalance: "",
                creditLimit: "",
                color: accountColors[0],
                notes: "",
            });
            onSuccess(result.data);
            onOpenChange(false);
        } else {
            toast.error(result.error);
        }

        setIsSubmitting(false);
    };

    const trigger = children || <Button>Create Account</Button>;

    return (
        <>
            <div onClick={() => onOpenChange(true)}>{trigger}</div>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Create New Account</DialogTitle>
                            <DialogDescription>Add a new financial account to track your money.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Account Name *</Label>
                                <Input
                                    id="name"
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Chase Checking"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Account Type *</Label>
                                    <Select value={form.type} onValueChange={(value: typeof form.type) => setForm((prev) => ({ ...prev, type: value }))}>
                                        <SelectTrigger id="type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accountTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select value={form.currency} onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}>
                                        <SelectTrigger id="currency">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                            <SelectItem value="GBP">GBP</SelectItem>
                                            <SelectItem value="INR">INR</SelectItem>
                                            <SelectItem value="JPY">JPY</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="initialBalance">Initial Balance</Label>
                                <Input
                                    id="initialBalance"
                                    type="number"
                                    step="0.01"
                                    value={form.initialBalance}
                                    onChange={(e) => setForm((prev) => ({ ...prev, initialBalance: e.target.value }))}
                                    placeholder="0.00"
                                />
                            </div>

                            {form.type === "credit_card" && (
                                <div className="grid gap-2">
                                    <Label htmlFor="creditLimit">Credit Limit</Label>
                                    <Input
                                        id="creditLimit"
                                        type="number"
                                        step="0.01"
                                        value={form.creditLimit}
                                        onChange={(e) => setForm((prev) => ({ ...prev, creditLimit: e.target.value }))}
                                        placeholder="0.00"
                                    />
                                    <p className="text-xs text-muted-foreground">Maximum credit available on this card</p>
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label>Account Color</Label>
                                <div className="flex gap-2">
                                    {accountColors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className="h-8 w-8 rounded-md border-2 transition-all hover:scale-110"
                                            style={{
                                                backgroundColor: color,
                                                borderColor: form.color === color ? "#000" : "transparent",
                                            }}
                                            onClick={() => setForm((prev) => ({ ...prev, color }))}
                                            aria-label={`Select ${color}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={form.notes}
                                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Optional notes about this account"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create Account"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

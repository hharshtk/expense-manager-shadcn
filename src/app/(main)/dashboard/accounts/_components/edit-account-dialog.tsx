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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FinancialAccount } from "@/lib/schema";

import { updateAccount } from "../_actions/account-actions";

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

type EditAccountDialogProps = {
    account: FinancialAccount;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (account: FinancialAccount) => void;
};

export function EditAccountDialog({ account, open, onOpenChange, onSuccess }: EditAccountDialogProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [form, setForm] = React.useState({
        name: account.name,
        type: account.type,
        currency: account.currency,
        creditLimit: account.creditLimit || "",
        color: account.color || accountColors[0],
        notes: account.notes || "",
        includeInTotal: account.includeInTotal ?? true,
    });

    // Update form when account changes
    React.useEffect(() => {
        setForm({
            name: account.name,
            type: account.type,
            currency: account.currency,
            creditLimit: account.creditLimit || "",
            color: account.color || accountColors[0],
            notes: account.notes || "",
            includeInTotal: account.includeInTotal ?? true,
        });
    }, [account]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error("Account name is required");
            return;
        }

        setIsSubmitting(true);
        const result = await updateAccount(account.id, {
            name: form.name.trim(),
            type: form.type,
            currency: form.currency,
            creditLimit: form.type === "credit_card" && form.creditLimit ? form.creditLimit : undefined,
            color: form.color,
            notes: form.notes.trim() || undefined,
            includeInTotal: form.includeInTotal,
        });

        if (result.success) {
            toast.success("Account updated successfully");
            onSuccess(result.data);
            onOpenChange(false);
        } else {
            toast.error(result.error);
        }

        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Account</DialogTitle>
                        <DialogDescription>Update your account details.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Account Name *</Label>
                            <Input
                                id="edit-name"
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. Chase Checking"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-type">Account Type *</Label>
                                <Select value={form.type} onValueChange={(value: typeof form.type) => setForm((prev) => ({ ...prev, type: value }))}>
                                    <SelectTrigger id="edit-type">
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
                                <Label htmlFor="edit-currency">Currency</Label>
                                <Select value={form.currency} onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}>
                                    <SelectTrigger id="edit-currency">
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

                        {form.type === "credit_card" && (
                            <div className="grid gap-2">
                                <Label htmlFor="edit-creditLimit">Credit Limit</Label>
                                <Input
                                    id="edit-creditLimit"
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

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="include-in-total">Include in Total Balance</Label>
                                <p className="text-sm text-muted-foreground">Include this account when calculating total balance</p>
                            </div>
                            <Switch
                                id="include-in-total"
                                checked={form.includeInTotal}
                                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, includeInTotal: checked }))}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea
                                id="edit-notes"
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
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

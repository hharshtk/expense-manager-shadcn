"use client";

import * as React from "react";

import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { FinancialAccount } from "@/lib/schema";

import { adjustAccountBalance } from "../_actions/account-actions";

type AdjustBalanceDialogProps = {
    account: FinancialAccount;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (account: FinancialAccount) => void;
};

export function AdjustBalanceDialog({ account, open, onOpenChange, onSuccess }: AdjustBalanceDialogProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<"add" | "withdraw">("add");
    const [form, setForm] = React.useState({
        amount: "",
        description: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const amount = Number.parseFloat(form.amount);
        if (Number.isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsSubmitting(true);
        const result = await adjustAccountBalance(account.id, form.amount, activeTab, form.description.trim() || undefined);

        if (result.success) {
            toast.success(`Balance ${activeTab === "add" ? "added" : "withdrawn"} successfully`);
            setForm({ amount: "", description: "" });
            onSuccess(result.data);
            onOpenChange(false);
        } else {
            toast.error(result.error);
        }

        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Adjust Balance</DialogTitle>
                    <DialogDescription>Add or withdraw money from {account.name}</DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="add">
                            <ArrowUpFromLine className="mr-2 h-4 w-4" />
                            Add Money
                        </TabsTrigger>
                        <TabsTrigger value="withdraw">
                            <ArrowDownToLine className="mr-2 h-4 w-4" />
                            Withdraw Money
                        </TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit}>
                        <TabsContent value="add" className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="add-amount">Amount *</Label>
                                <Input
                                    id="add-amount"
                                    type="number"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="add-description">Description</Label>
                                <Textarea
                                    id="add-description"
                                    value={form.description}
                                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Optional: Why are you adding money?"
                                    rows={3}
                                />
                            </div>

                            <div className="rounded-lg bg-muted p-3 text-sm">
                                <p className="font-medium">Current Balance:</p>
                                <p className="text-lg">
                                    {account.currency} {Number.parseFloat(account.currentBalance || "0").toFixed(2)}
                                </p>
                                {form.amount && (
                                    <>
                                        <p className="mt-2 font-medium">New Balance:</p>
                                        <p className="text-lg text-green-600">
                                            {account.currency}{" "}
                                            {(Number.parseFloat(account.currentBalance || "0") + Number.parseFloat(form.amount || "0")).toFixed(2)}
                                        </p>
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="withdraw" className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="withdraw-amount">Amount *</Label>
                                <Input
                                    id="withdraw-amount"
                                    type="number"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="withdraw-description">Description</Label>
                                <Textarea
                                    id="withdraw-description"
                                    value={form.description}
                                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Optional: Why are you withdrawing money?"
                                    rows={3}
                                />
                            </div>

                            <div className="rounded-lg bg-muted p-3 text-sm">
                                <p className="font-medium">Current Balance:</p>
                                <p className="text-lg">
                                    {account.currency} {Number.parseFloat(account.currentBalance || "0").toFixed(2)}
                                </p>
                                {form.amount && (
                                    <>
                                        <p className="mt-2 font-medium">New Balance:</p>
                                        <p className="text-lg text-orange-600">
                                            {account.currency}{" "}
                                            {(Number.parseFloat(account.currentBalance || "0") - Number.parseFloat(form.amount || "0")).toFixed(2)}
                                        </p>
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Processing..." : activeTab === "add" ? "Add Money" : "Withdraw Money"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

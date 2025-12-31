"use client";

import * as React from "react";

import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Building2,
    CreditCard,
    Edit,
    MoreVertical,
    Smartphone,
    Trash2,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FinancialAccount } from "@/lib/schema";

import { deleteAccount } from "../_actions/account-actions";
import { AdjustBalanceDialog } from "./adjust-balance-dialog";
import { EditAccountDialog } from "./edit-account-dialog";

const accountTypeIcons = {
    cash: Wallet,
    bank: Building2,
    credit_card: CreditCard,
    debit_card: CreditCard,
    digital_wallet: Smartphone,
    investment: TrendingUp,
    loan: ArrowDownToLine,
    other: Wallet,
};

const accountTypeLabels = {
    cash: "Cash",
    bank: "Bank Account",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    digital_wallet: "Digital Wallet",
    investment: "Investment",
    loan: "Loan",
    other: "Other",
};

type AccountCardProps = {
    account: FinancialAccount;
    onUpdate: (account: FinancialAccount) => void;
    onDelete: (accountId: number) => void;
};

export function AccountCard({ account, onUpdate, onDelete }: AccountCardProps) {
    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const [adjustDialogOpen, setAdjustDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const balance = Number.parseFloat(account.currentBalance || "0");
    const Icon = accountTypeIcons[account.type] || Wallet;

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${account.name}"? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        const result = await deleteAccount(account.id);

        if (result.success) {
            toast.success("Account deleted successfully");
            onDelete(account.id);
        } else {
            toast.error(result.error);
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Card className="relative overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full w-1"
                    style={{ backgroundColor: account.color || "#6366f1" }}
                />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-start gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${account.color || "#6366f1"}15` }}
                        >
                            <Icon className="h-5 w-5" style={{ color: account.color || "#6366f1" }} />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold">{account.name}</CardTitle>
                            <CardDescription className="text-xs">{accountTypeLabels[account.type]}</CardDescription>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Account
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAdjustDialogOpen(true)}>
                                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                                Adjust Balance
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Account
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div>
                            <div className="text-2xl font-bold">
                                {account.currency} {balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-muted-foreground">Current Balance</p>
                        </div>
                        {account.includeInTotal && (
                            <Badge variant="secondary" className="text-xs">
                                Included in total
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            <EditAccountDialog
                account={account}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={onUpdate}
            />

            <AdjustBalanceDialog
                account={account}
                open={adjustDialogOpen}
                onOpenChange={setAdjustDialogOpen}
                onSuccess={onUpdate}
            />
        </>
    );
}

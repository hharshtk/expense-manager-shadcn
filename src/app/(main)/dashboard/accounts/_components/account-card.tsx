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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCurrencySymbol } from "@/lib/currency";
import type { FinancialAccount } from "@/lib/schema";
import type { UserSettings } from "@/server/user-settings-actions";

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
    userSettings: UserSettings;
    onUpdate: (account: FinancialAccount) => void;
    onDelete: (accountId: number) => void;
};

export function AccountCard({ account, userSettings, onUpdate, onDelete }: AccountCardProps) {
    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const [adjustDialogOpen, setAdjustDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const balance = Number.parseFloat(account.currentBalance || "0");
    const Icon = accountTypeIcons[account.type] || Wallet;
    const currencySymbol = getCurrencySymbol(account.currency || userSettings.defaultCurrency);

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
            <div className="group relative flex flex-col justify-between rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-primary/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold truncate">{account.name}</span>
                                {account.includeInTotal && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="h-1 w-1 rounded-full bg-primary shrink-0" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-[10px]">Included in total balance</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{accountTypeLabels[account.type]}</span>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3.5 w-3.5" />
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
                            {!account.isDefault && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Account
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                    <div className="text-xl font-bold tracking-tight tabular-nums">
                        <span className="text-sm font-medium text-muted-foreground mr-0.5">{currencySymbol}</span>
                        {balance.toLocaleString(userSettings.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div
                        className="h-1.5 w-6 rounded-full opacity-80"
                        style={{ backgroundColor: account.color || "#6366f1" }}
                    />
                </div>
            </div>

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

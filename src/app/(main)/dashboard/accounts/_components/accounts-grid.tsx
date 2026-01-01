"use client";

import * as React from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FinancialAccount } from "@/lib/schema";
import type { UserSettings } from "@/server/user-settings-actions";

import { AccountCard } from "./account-card";
import { CreateAccountDialog } from "./create-account-dialog";

type AccountsGridProps = {
    accounts: FinancialAccount[];
    userSettings: UserSettings;
};

export function AccountsGrid({ accounts: initialAccounts, userSettings }: AccountsGridProps) {
    const [accounts, setAccounts] = React.useState(initialAccounts);
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

    const handleAccountCreated = (newAccount: FinancialAccount) => {
        setAccounts((prev) => [newAccount, ...prev]);
        setCreateDialogOpen(false);
    };

    const handleAccountUpdated = (updatedAccount: FinancialAccount) => {
        setAccounts((prev) => prev.map((account) => (account.id === updatedAccount.id ? updatedAccount : account)));
    };

    const handleAccountDeleted = (accountId: number) => {
        setAccounts((prev) => prev.filter((account) => account.id !== accountId));
    };

    if (accounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <h3 className="mb-2 text-lg font-semibold">No accounts yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                    Get started by creating your first financial account to track your money.
                </p>
                <CreateAccountDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={handleAccountCreated}>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Account
                    </Button>
                </CreateAccountDialog>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Accounts</h2>
                <CreateAccountDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={handleAccountCreated}>
                    <Button size="sm" variant="outline" className="h-8">
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Add Account
                    </Button>
                </CreateAccountDialog>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {accounts.map((account) => (
                    <AccountCard
                        key={account.id}
                        account={account}
                        userSettings={userSettings}
                        onUpdate={handleAccountUpdated}
                        onDelete={handleAccountDeleted}
                    />
                ))}
            </div>
        </div>
    );
}


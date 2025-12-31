"use client";

import { PiggyBank, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrencySymbol } from "@/lib/currency";
import type { UserSettings } from "@/server/user-settings-actions";

type AccountSummary = {
    totalBalance: string;
    accountCount: number;
    activeAccountCount: number;
};

type AccountSummaryCardsProps = {
    summary: AccountSummary;
    userSettings: UserSettings;
};

export function AccountSummaryCards({ summary, userSettings }: AccountSummaryCardsProps) {
    const totalBalance = Number.parseFloat(summary.totalBalance || "0");
    const currencySymbol = getCurrencySymbol(userSettings.defaultCurrency);

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <span className="text-lg font-semibold text-muted-foreground">{currencySymbol}</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {currencySymbol}{totalBalance.toLocaleString(userSettings.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Across all accounts</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.activeAccountCount}</div>
                    <p className="text-xs text-muted-foreground">Currently in use</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                    <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.accountCount}</div>
                    <p className="text-xs text-muted-foreground">All accounts</p>
                </CardContent>
            </Card>
        </div>
    );
}

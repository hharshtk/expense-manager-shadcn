"use client";

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
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-5 shadow-sm">
            {/* Decorative background element */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
            
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Total Net Worth
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-medium text-muted-foreground/60">{currencySymbol}</span>
                        <span className="text-3xl font-bold tracking-tight tabular-nums">
                            {totalBalance.toLocaleString(userSettings.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                            Total Accounts
                        </span>
                        <span className="text-lg font-bold tabular-nums">{summary.accountCount}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                            Active Now
                        </span>
                        <span className="text-lg font-bold tabular-nums">{summary.activeAccountCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

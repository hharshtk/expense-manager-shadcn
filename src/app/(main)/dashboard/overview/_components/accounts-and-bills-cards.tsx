"use client";

import { CreditCard, DollarSign, Landmark, Wallet } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

const accountTypeIcons = {
  bank: Landmark,
  credit_card: CreditCard,
  cash: Wallet,
  digital_wallet: DollarSign,
  investment: DollarSign,
  loan: DollarSign,
  other: Wallet,
};

interface AccountsAndBillsCardsProps {
  currency?: string;
  data?: {
    id: number;
    name: string;
    type: string;
    balance: number;
    currency: string;
  }[];
}

export function AccountsAndBillsCards({ currency = "USD", data = [] }: AccountsAndBillsCardsProps) {
  const totalBalance = data.reduce((acc, account) => acc + account.balance, 0);

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Account Balances</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{formatCurrency(totalBalance, { currency })}</span>
          </div>
        </div>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/accounts">Manage Accounts</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.map((account) => {
            const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
            const isNegative = account.balance < 0;

            return (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-xs font-medium">{account.name}</p>
                    <p className="text-[10px] capitalize text-muted-foreground">
                      {account.type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "ml-2 shrink-0 text-xs font-semibold tabular-nums",
                    isNegative ? "text-destructive" : "text-foreground"
                  )}
                >
                  {formatCurrency(account.balance, {
                    currency: account.currency || currency,
                    noDecimals: true,
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

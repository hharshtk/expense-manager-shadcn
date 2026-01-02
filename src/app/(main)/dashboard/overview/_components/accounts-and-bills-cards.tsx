"use client";

import { CreditCard, DollarSign, Landmark, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Account Balances Card */}
      <Card className="shadow-xs lg:col-span-2">
        <CardHeader>
          <CardTitle>Account Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(totalBalance, { currency })}</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="size-6 text-primary" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((account) => {
              const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
              const isNegative = account.balance < 0;

              return (
                <div key={account.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{account.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {account.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium tabular-nums",
                      isNegative ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {formatCurrency(account.balance, { currency: account.currency || currency })}
                  </span>
                </div>
              );
            })}
          </div>

          <Button variant="outline" size="sm" className="mt-4 w-full">
            Manage Accounts
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

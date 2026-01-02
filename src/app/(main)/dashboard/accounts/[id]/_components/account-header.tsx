import {
  Building2,
  CreditCard,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { FinancialAccount } from "@/lib/schema";
import type { UserSettings } from "@/server/user-settings-actions";
import { getCurrencySymbol } from "@/lib/currency";

const accountTypeIcons = {
  cash: Wallet,
  bank: Building2,
  credit_card: CreditCard,
  debit_card: CreditCard,
  digital_wallet: Smartphone,
  investment: TrendingUp,
  loan: Building2,
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

interface AccountHeaderProps {
  account: FinancialAccount;
  userSettings: UserSettings;
}

export function AccountHeader({ account, userSettings }: AccountHeaderProps) {
  const Icon = accountTypeIcons[account.type] || Wallet;

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-t from-primary/10 to-muted/50 border border-primary/10 shadow-xs">
        <Icon className="h-4.5 w-4.5 text-primary/70" />
      </div>
      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight">{account.name}</h2>
          {account.isActive ? (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-muted/50 text-muted-foreground border-none">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground/50 border-muted-foreground/10">
              Inactive
            </Badge>
          )}
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {accountTypeLabels[account.type]}
        </p>
      </div>
    </div>
  );
}

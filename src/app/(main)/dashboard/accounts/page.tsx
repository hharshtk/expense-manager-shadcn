import { getAccounts } from "./_actions/account-actions";
import { AccountsGrid } from "./_components/accounts-grid";
import { AccountSummaryCards } from "./_components/account-summary-cards";

export default async function AccountsPage() {
    const result = await getAccounts();
    const accounts = result.success ? result.data : [];

    // Calculate summary from accounts
    const totalBalance = accounts
        .filter((acc) => acc.includeInTotal)
        .reduce((sum, acc) => sum + Number.parseFloat(acc.currentBalance || "0"), 0);

    const summary = {
        totalBalance: totalBalance.toString(),
        accountCount: accounts.length,
        activeAccountCount: accounts.filter((acc) => acc.isActive).length,
    };

    return (
        <div className="@container/main flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
                    <p className="text-sm text-muted-foreground">Manage your financial accounts and balances</p>
                </div>
            </div>

            <AccountSummaryCards summary={summary} />
            <AccountsGrid accounts={accounts} />
        </div>
    );
}

import { getUserSettings } from "@/server/user-settings-actions";

import { getAccounts } from "./_actions/account-actions";
import { AccountsGrid } from "./_components/accounts-grid";
import { AccountSummaryCards } from "./_components/account-summary-cards";

export default async function AccountsPage() {
    const [accountsResult, settingsResult] = await Promise.all([
        getAccounts(),
        getUserSettings(),
    ]);

    const accounts = accountsResult.success ? accountsResult.data : [];
    const userSettings = settingsResult.success
        ? settingsResult.data
        : { defaultCurrency: "USD", locale: "en-US", timezone: "UTC", dateFormat: "MM/DD/YYYY" };

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

            <AccountSummaryCards summary={summary} userSettings={userSettings} />
            <AccountsGrid accounts={accounts} userSettings={userSettings} />
        </div>
    );
}

import { getUserSettings } from "@/server/user-settings-actions";

import { DataTable } from "./_components/data-table";
import { getExpenses } from "./_queries/expense-queries";

export default async function Page() {
  const [expenses, settingsResult] = await Promise.all([
    getExpenses(),
    getUserSettings(),
  ]);

  const userSettings = settingsResult.success
    ? settingsResult.data
    : { defaultCurrency: "USD", locale: "en-US", timezone: "UTC", dateFormat: "MM/DD/YYYY" };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={expenses} userSettings={userSettings} />
    </div>
  );
}

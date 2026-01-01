import { getUserSettings } from "@/server/user-settings-actions";

import { DataTable } from "./_components/data-table";
import { TestTransactionButton } from "./_components/test-transaction-button";
import { getExpenses } from "./_queries/expense-queries";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: PageProps) {
  const [expenses, settingsResult, params] = await Promise.all([
    getExpenses(),
    getUserSettings(),
    searchParams,
  ]);

  const userSettings = settingsResult.success
    ? settingsResult.data
    : { defaultCurrency: "USD", locale: "en-US", timezone: "UTC", dateFormat: "MM/DD/YYYY" };

  // Show test button in development always, or in production with query param
  const isDevelopment = process.env.NODE_ENV === "development";
  const hasTestParam = params["temp-transaction"] === "true";
  const showTestButton = isDevelopment || hasTestParam;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={expenses} userSettings={userSettings} testButton={showTestButton ? <TestTransactionButton /> : null} />
    </div>
  );
}

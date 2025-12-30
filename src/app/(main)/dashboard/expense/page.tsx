import { DataTable } from "./_components/data-table";
import { getExpenses } from "./_queries/expense-queries";

export default async function Page() {
  const expenses = await getExpenses();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={expenses} />
    </div>
  );
}

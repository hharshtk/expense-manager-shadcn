import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight, EllipsisVertical, Trash2 } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Transaction } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type ColumnActions = {
  onDelete: (id: number) => void;
  onUpdate: (item: Transaction) => void;
};

export function createColumns({ onDelete, onUpdate }: ColumnActions): ColumnDef<Transaction>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => {
        return <TableCellViewer key={row.original.id} item={row.original} onUpdate={onUpdate} />;
      },
      enableSorting: false,
    },
    {
      accessorKey: "date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <div className="text-muted-foreground tabular-nums">
          {format(new Date(row.original.date), "dd-MMM-yyyy")}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Amount" />,
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.original.amount);
        const signedAmount = row.original.type === "expense" ? -amount : amount;
        const isIncome = row.original.type === "income";
        return (
          <div className="flex items-center justify-end gap-1.5 font-medium tabular-nums">
            {isIncome ? (
              <ArrowDownLeft className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowUpRight className="size-4 text-red-600 dark:text-red-400" />
            )}
            {currency.format(signedAmount)}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
              size="icon"
            >
              <EllipsisVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original.id)}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];
}

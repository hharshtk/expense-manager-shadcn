import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight, CircleCheck, EllipsisVertical, Loader, Trash2 } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
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
        return <TableCellViewer item={row.original} onUpdate={onUpdate} />;
      },
      enableSorting: false,
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {row.original.type === "income" ? <ArrowDownLeft /> : <ArrowUpRight />}
          {row.original.type === "income" ? "Income" : "Expense"}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <div className="text-muted-foreground tabular-nums">{row.original.date}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "isConfirmed",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {row.original.isConfirmed ? (
            <CircleCheck className="fill-green-500 stroke-border dark:fill-green-400" />
          ) : (
            <Loader />
          )}
          {row.original.isConfirmed ? "Confirmed" : "Pending"}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Amount" />,
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.original.amount);
        const signedAmount = row.original.type === "expense" ? -amount : amount;
        return <div className="text-right font-medium tabular-nums">{currency.format(signedAmount)}</div>;
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

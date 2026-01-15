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
import { getCurrencySymbol } from "@/lib/currency";
import { icons } from "@/components/ui/icon-picker";
import type { UserSettings } from "@/server/user-settings-actions";

import type { Transaction } from "./schema";

type ColumnActions = {
  onDelete: (id: number) => void;
  onUpdate: (item: Transaction) => void;
  onEdit: (item: Transaction) => void;
  userSettings: UserSettings;
};

export function createColumns({ onDelete, onUpdate, onEdit, userSettings }: ColumnActions): ColumnDef<Transaction>[] {
  const currencySymbol = getCurrencySymbol(userSettings.defaultCurrency);

  const formatCurrencyValue = (amount: number) => {
    const formattedNumber = new Intl.NumberFormat(userSettings.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    const sign = amount < 0 ? "-" : "";
    return `${sign}${currencySymbol}${formattedNumber}`;
  };

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
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => {
        const category = row.original.category;
        const Icon = category?.icon && icons[category.icon as keyof typeof icons]
          ? icons[category.icon as keyof typeof icons]
          : null;

        return (
          <div className="flex items-center gap-2">
            {category ? (
              <>
                {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
                <span className="capitalize">{category.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Uncategorized</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => {
        const description = row.original.description;
        const notes = row.original.notes;

        return (
          <div className="flex flex-col gap-1">
            {description && (
              <div className="text-sm truncate max-w-48" title={description}>
                {description}
              </div>
            )}
            {notes && (
              <div className="text-[10px] text-muted-foreground/70 italic truncate max-w-48" title={notes}>
                {notes}
              </div>
            )}
          </div>
        );
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
        const isIncome = row.original.type === "income";
        const formattedNumber = new Intl.NumberFormat(userSettings.locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
        const displayValue = `${currencySymbol}${formattedNumber}`;
        
        return (
          <div className={`flex items-center justify-end gap-1.5 font-medium tabular-nums ${
            isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}>
            {displayValue}
            {isIncome ? (
              <ArrowDownLeft className="size-4" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
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
            <DropdownMenuItem onClick={() => onEdit(row.original)}>View details</DropdownMenuItem>
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

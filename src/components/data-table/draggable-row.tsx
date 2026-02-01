"use no memo";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, type Row } from "@tanstack/react-table";

import { TableCell, TableRow } from "@/components/ui/table";
import { getCurrencySymbol } from "@/lib/currency";

export function DraggableRow<TData>({ row, userSettings }: { row: Row<TData>; userSettings?: { defaultCurrency: string; locale: string } }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: (row.original as { id: number }).id,
  });

  return (
    <>
      <TableRow
        data-state={row.getIsSelected() && "selected"}
        data-dragging={isDragging}
        ref={setNodeRef}
        className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
        style={{
          transform: CSS.Transform.toString(transform),
          transition: transition,
        }}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
        ))}
      </TableRow>
      {row.getIsExpanded() && (
        <TableRow key={`${row.id}-expanded`}>
          <TableCell colSpan={row.getVisibleCells().length} className="bg-muted/30 border-t-0 p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Items:</h4>
              <div className="space-y-1">
                {(row.original as any).expenseItems?.map((item: any, index: number) => {
                  const currencySymbol = userSettings ? getCurrencySymbol(userSettings.defaultCurrency) : '$';
                  return (
                    <div key={item.id || index} className="flex items-center justify-between text-sm bg-background rounded p-2 border">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          {item.quantity} {item.unit || 'units'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{item.totalPrice ? `${currencySymbol}${item.totalPrice}` : ''}</div>
                        {item.unitPrice && (
                          <div className="text-xs text-muted-foreground">
                            {currencySymbol}{item.unitPrice} per {item.unit || 'unit'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

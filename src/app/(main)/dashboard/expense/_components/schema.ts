import { z } from "zod";

// Schema matching the database expenses table
export const transactionSchema = z.object({
  id: z.number(),
  userId: z.number(),
  categoryId: z.number().nullable(),
  financialAccountId: z.number().nullable(),
  paymentMethodId: z.number().nullable(),
  budgetId: z.number().nullable(),
  type: z.enum(["expense", "income"]),
  amount: z.string(), // decimal stored as string
  currency: z.string(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  date: z.string(),
  time: z.string().nullable(),
  location: z.string().nullable(),
  merchant: z.string().nullable(),
  tags: z.string().nullable(),
  isRecurring: z.boolean().nullable(),
  recurrenceType: z.enum(["none", "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]).nullable(),
  recurrenceEndDate: z.string().nullable(),
  parentExpenseId: z.number().nullable(),
  isConfirmed: z.boolean().nullable(),
  isExcludedFromStats: z.boolean().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for expense items (sub-items within a transaction)
export const expenseItemSchema = z.object({
  id: z.number(),
  expenseId: z.number(),
  name: z.string().min(1, "Item name is required"),
  quantity: z.string().min(1, "Quantity is required"), // decimal stored as string
  unit: z.string().nullable(),
  unitPrice: z.string().nullable(), // decimal stored as string
  totalPrice: z.string().min(1, "Total price is required"), // decimal stored as string
  notes: z.string().nullable(),
  sortOrder: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ExpenseItem = z.infer<typeof expenseItemSchema>;

// Extended Transaction type to include joined category data and expense items
export type Transaction = z.infer<typeof transactionSchema> & {
  category: {
    id: number;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  expenseItems?: ExpenseItem[];
};

// Form schema for creating/updating expense items
export const expenseItemFormSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unit: z.string().optional(),
  unitPrice: z.string().optional(),
  totalPrice: z.string().min(1, "Total price is required"),
  notes: z.string().optional(),
});

export type ExpenseItemFormValues = z.infer<typeof expenseItemFormSchema>;

// Form schema for creating/updating expenses
export const expenseFormSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  isConfirmed: z.boolean().optional(),
  expenseItems: z.array(expenseItemFormSchema).optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

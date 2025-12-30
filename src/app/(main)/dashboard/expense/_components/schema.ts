import { z } from "zod";

// Schema matching the database expenses table
export const transactionSchema = z.object({
  id: z.number(),
  userId: z.number(),
  categoryId: z.number().nullable(),
  financialAccountId: z.number().nullable(),
  paymentMethodId: z.number().nullable(),
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

export type Transaction = z.infer<typeof transactionSchema>;

// Form schema for creating/updating expenses
export const expenseFormSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  isConfirmed: z.boolean().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

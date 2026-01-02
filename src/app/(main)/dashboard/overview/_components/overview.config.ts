import type { ChartConfig } from "@/components/ui/chart";

// Time period presets for the date range selector
export const timePeriodPresets = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 15 days", value: "15d", days: 15 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 3 months", value: "3m", days: 90 },
  { label: "Last 6 months", value: "6m", days: 180 },
  { label: "Last 12 months", value: "12m", days: 365 },
  { label: "This month", value: "this-month", days: -1 },
  { label: "This year", value: "this-year", days: -2 },
  { label: "All time", value: "all", days: -3 },
] as const;

export type TimePeriodValue = (typeof timePeriodPresets)[number]["value"];

// Mock data for expense trends chart
export const expenseTrendsData = [
  { date: "2025-09-01", expenses: 1200, income: 4500 },
  { date: "2025-09-08", expenses: 890, income: 0 },
  { date: "2025-09-15", expenses: 1450, income: 4500 },
  { date: "2025-09-22", expenses: 780, income: 0 },
  { date: "2025-09-29", expenses: 1100, income: 0 },
  { date: "2025-10-06", expenses: 950, income: 4500 },
  { date: "2025-10-13", expenses: 1320, income: 0 },
  { date: "2025-10-20", expenses: 870, income: 4500 },
  { date: "2025-10-27", expenses: 1580, income: 0 },
  { date: "2025-11-03", expenses: 1100, income: 4500 },
  { date: "2025-11-10", expenses: 920, income: 0 },
  { date: "2025-11-17", expenses: 1250, income: 4500 },
  { date: "2025-11-24", expenses: 1680, income: 0 },
  { date: "2025-12-01", expenses: 2100, income: 4500 },
  { date: "2025-12-08", expenses: 1450, income: 0 },
  { date: "2025-12-15", expenses: 3200, income: 4500 },
  { date: "2025-12-22", expenses: 2850, income: 0 },
  { date: "2025-12-29", expenses: 1200, income: 4500 },
];

export const expenseTrendsChartConfig = {
  expenses: {
    label: "Expenses",
    color: "var(--chart-2)",
  },
  income: {
    label: "Income",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

// Mock data for spending by category
export const spendingByCategoryData = [
  { category: "groceries", amount: 2450, fill: "var(--color-groceries)" },
  { category: "utilities", amount: 890, fill: "var(--color-utilities)" },
  { category: "transport", amount: 650, fill: "var(--color-transport)" },
  { category: "entertainment", amount: 420, fill: "var(--color-entertainment)" },
  { category: "dining", amount: 380, fill: "var(--color-dining)" },
  { category: "other", amount: 310, fill: "var(--color-other)" },
];

export const spendingByCategoryChartConfig = {
  amount: {
    label: "Amount",
  },
  groceries: {
    label: "Groceries",
    color: "var(--chart-1)",
  },
  utilities: {
    label: "Utilities",
    color: "var(--chart-2)",
  },
  transport: {
    label: "Transport",
    color: "var(--chart-3)",
  },
  entertainment: {
    label: "Entertainment",
    color: "var(--chart-4)",
  },
  dining: {
    label: "Dining Out",
    color: "var(--chart-5)",
  },
  other: {
    label: "Other",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

// Monthly overview data for bar chart
export const monthlyOverviewData = [
  { month: "Jul", expenses: 3200, income: 9000, budget: 4000 },
  { month: "Aug", expenses: 3800, income: 9000, budget: 4000 },
  { month: "Sep", expenses: 3100, income: 9000, budget: 4000 },
  { month: "Oct", expenses: 4200, income: 9000, budget: 4000 },
  { month: "Nov", expenses: 3650, income: 9000, budget: 4000 },
  { month: "Dec", expenses: 5800, income: 9500, budget: 4500 },
];

export const monthlyOverviewChartConfig = {
  expenses: {
    label: "Expenses",
    color: "var(--chart-2)",
  },
  income: {
    label: "Income",
    color: "var(--chart-1)",
  },
  budget: {
    label: "Budget",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

// Budget progress data
export const budgetProgressData = [
  { category: "Groceries", spent: 2450, budget: 3000, percentage: 82 },
  { category: "Utilities", spent: 890, budget: 1000, percentage: 89 },
  { category: "Transport", spent: 650, budget: 800, percentage: 81 },
  { category: "Entertainment", spent: 420, budget: 500, percentage: 84 },
  { category: "Dining Out", spent: 380, budget: 400, percentage: 95 },
];

// Recent transactions mock data
export const recentTransactionsData = [
  {
    id: 1,
    description: "Grocery Store",
    category: "Groceries",
    amount: -125.50,
    date: "2025-12-28",
    type: "expense" as const,
  },
  {
    id: 2,
    description: "Salary Deposit",
    category: "Income",
    amount: 4500.00,
    date: "2025-12-27",
    type: "income" as const,
  },
  {
    id: 3,
    description: "Electric Bill",
    category: "Utilities",
    amount: -145.00,
    date: "2025-12-26",
    type: "expense" as const,
  },
  {
    id: 4,
    description: "Restaurant",
    category: "Dining Out",
    amount: -68.50,
    date: "2025-12-25",
    type: "expense" as const,
  },
  {
    id: 5,
    description: "Gas Station",
    category: "Transport",
    amount: -52.00,
    date: "2025-12-24",
    type: "expense" as const,
  },
  {
    id: 6,
    description: "Online Subscription",
    category: "Entertainment",
    amount: -15.99,
    date: "2025-12-23",
    type: "expense" as const,
  },
  {
    id: 7,
    description: "Freelance Payment",
    category: "Income",
    amount: 850.00,
    date: "2025-12-22",
    type: "income" as const,
  },
  {
    id: 8,
    description: "Pharmacy",
    category: "Health",
    amount: -42.50,
    date: "2025-12-21",
    type: "expense" as const,
  },
];

// Upcoming bills/scheduled payments
export const upcomingBillsData = [
  { id: 1, name: "Rent Payment", amount: 1500, dueDate: "2026-01-05", category: "Housing", isPaid: false },
  { id: 2, name: "Internet Bill", amount: 89, dueDate: "2026-01-08", category: "Utilities", isPaid: false },
  { id: 3, name: "Car Insurance", amount: 185, dueDate: "2026-01-10", category: "Insurance", isPaid: false },
  { id: 4, name: "Phone Bill", amount: 65, dueDate: "2026-01-12", category: "Utilities", isPaid: false },
];

// Account balances
export const accountBalancesData = [
  { id: 1, name: "Main Checking", type: "bank", balance: 8542.50, currency: "USD" },
  { id: 2, name: "Savings Account", type: "bank", balance: 15200.00, currency: "USD" },
  { id: 3, name: "Credit Card", type: "credit_card", balance: -1245.80, currency: "USD" },
  { id: 4, name: "Cash Wallet", type: "cash", balance: 320.00, currency: "USD" },
];

// Insights and alerts
export const insightsData = [
  {
    id: 1,
    type: "warning" as const,
    title: "Dining Budget Alert",
    message: "You've used 95% of your dining budget this month",
    action: "View Budget",
  },
  {
    id: 2,
    type: "success" as const,
    title: "Savings Goal Progress",
    message: "You're on track to reach your emergency fund goal",
    action: "View Goal",
  },
  {
    id: 3,
    type: "info" as const,
    title: "Spending Trend",
    message: "Your grocery spending decreased by 12% compared to last month",
    action: "View Details",
  },
];

import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const expenseTypeEnum = pgEnum("expense_type", ["expense", "income"]);
export const recurrenceTypeEnum = pgEnum("recurrence_type", [
  "none",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);
export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "credit_card",
  "debit_card",
  "digital_wallet",
  "investment",
  "loan",
  "other",
]);
export const budgetPeriodEnum = pgEnum("budget_period", ["daily", "weekly", "monthly", "quarterly", "yearly"]);
export const investmentTypeEnum = pgEnum("investment_type", [
  "stock",
  "mutual_fund",
  "etf",
  "bond",
  "crypto",
  "commodity",
  "other",
]);
export const transactionTypeEnum = pgEnum("transaction_type", ["buy", "sell", "dividend", "split", "bonus"]);
export const alertTypeEnum = pgEnum("alert_type", ["price_above", "price_below", "percent_change"]);

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

/**
 * Users table - Core user information
 * Supports both email/password and OAuth authentication
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }), // Nullable for OAuth users
    name: varchar("name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    emailVerified: boolean("email_verified").default(false),
    isActive: boolean("is_active").default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // User preferences
    defaultCurrency: varchar("default_currency", { length: 3 }).default("USD"),
    timezone: varchar("timezone", { length: 100 }).default("UTC"),
    locale: varchar("locale", { length: 15 }).default("en-US"),
    dateFormat: varchar("date_format", { length: 20 }).default("MM/DD/YYYY"),
  },
  (table) => [index("idx_users_email").on(table.email), index("idx_users_created_at").on(table.createdAt)],
);

/**
 * OAuth Accounts - Links OAuth providers to users
 */
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(), // google, github, etc.
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    tokenType: varchar("token_type", { length: 50 }),
    scope: text("scope"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_oauth_provider_account").on(table.provider, table.providerAccountId),
    index("idx_oauth_user_id").on(table.userId),
  ],
);

/**
 * Sessions table - User sessions for JWT-based auth
 */
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 500 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_sessions_token").on(table.token), index("idx_sessions_user_id").on(table.userId)],
);

// ============================================================================
// FINANCIAL ACCOUNTS
// ============================================================================

/**
 * Financial Accounts - Bank accounts, wallets, credit cards, etc.
 */
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    type: accountTypeEnum("type").notNull().default("bank"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    initialBalance: decimal("initial_balance", { precision: 15, scale: 2 }).default("0"),
    currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).default("0"),
    creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }), // Credit limit for credit cards
    color: varchar("color", { length: 7 }), // Hex color for UI
    icon: varchar("icon", { length: 50 }), // Icon name
    isActive: boolean("is_active").default(true),
    includeInTotal: boolean("include_in_total").default(true),
    isDefault: boolean("is_default").default(false), // Default account cannot be deleted
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_financial_accounts_user_id").on(table.userId)],
);

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * Categories - Expense/Income categories with hierarchical support
 */
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // Null for system defaults
    parentId: integer("parent_id"), // Self-reference for subcategories
    name: varchar("name", { length: 101 }).notNull(),
    type: expenseTypeEnum("type").notNull().default("expense"),
    color: varchar("color", { length: 7 }), // Hex color
    icon: varchar("icon", { length: 50 }),
    isSystem: boolean("is_system").default(false), // System-defined categories
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_categories_user_id").on(table.userId), index("idx_categories_parent_id").on(table.parentId)],
);

// ============================================================================
// PAYMENT METHODS
// ============================================================================

/**
 * Payment Methods - User's payment methods
 */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // cash, card, bank_transfer, etc.
    lastFourDigits: varchar("last_four_digits", { length: 4 }),
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    color: varchar("color", { length: 7 }),
    icon: varchar("icon", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_payment_methods_user_id").on(table.userId)],
);

// ============================================================================
// EXPENSES & TRANSACTIONS
// ============================================================================

/**
 * Expenses - Core expense/income transactions
 */
export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    financialAccountId: integer("financial_account_id").references(() => financialAccounts.id, {
      onDelete: "set null",
    }),
    paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id, { onDelete: "set null" }),
    budgetId: integer("budget_id").references(() => budgets.id, { onDelete: "set null" }), // Direct budget assignment
    type: expenseTypeEnum("type").notNull().default("expense"),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    description: varchar("description", { length: 500 }),
    notes: text("notes"),
    date: date("date").notNull(),
    time: varchar("time", { length: 8 }), // HH:MM:SS format
    location: varchar("location", { length: 255 }),
    merchant: varchar("merchant", { length: 255 }),
    // Tags stored as comma-separated values
    tags: text("tags"),
    // Recurrence
    isRecurring: boolean("is_recurring").default(false),
    recurrenceType: recurrenceTypeEnum("recurrence_type").default("none"),
    recurrenceEndDate: date("recurrence_end_date"),
    parentExpenseId: integer("parent_expense_id"), // For recurring expense instances
    // Status
    isConfirmed: boolean("is_confirmed").default(true),
    isExcludedFromStats: boolean("is_excluded_from_stats").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_expenses_user_id").on(table.userId),
    index("idx_expenses_category_id").on(table.categoryId),
    index("idx_expenses_date").on(table.date),
    index("idx_expenses_user_date").on(table.userId, table.date),
    index("idx_expenses_type").on(table.type),
  ],
);

// ============================================================================
// EXPENSE ITEMS
// ============================================================================

/**
 * Expense Items - Individual items within a transaction (for grouped purchases)
 * Allows tracking sub-items with quantities, weights, etc.
 */
export const expenseItems = pgTable(
  "expense_items",
  {
    id: serial("id").primaryKey(),
    expenseId: integer("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // Item name (e.g., "Tomatoes", "Apples")
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("1"), // Quantity purchased
    unit: varchar("unit", { length: 50 }), // Unit of measurement (kg, lbs, pieces, liters, etc.)
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }), // Price per unit (optional, can be calculated)
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(), // Total price for this item
    notes: text("notes"), // Additional notes for this item
    sortOrder: integer("sort_order").default(0), // For ordering items within a transaction
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_expense_items_expense_id").on(table.expenseId),
    index("idx_expense_items_sort_order").on(table.expenseId, table.sortOrder),
  ],
);

// ============================================================================
// BUDGETS
// ============================================================================

/**
 * Budgets - Budget tracking per category or overall
 */
export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }), // Null for overall budget
    name: varchar("name", { length: 100 }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    period: budgetPeriodEnum("period").notNull().default("monthly"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    isActive: boolean("is_active").default(true),
    rollover: boolean("rollover").default(false), // Carry over unused budget
    alertThreshold: integer("alert_threshold").default(80), // Percentage to trigger alert
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_budgets_user_id").on(table.userId), index("idx_budgets_category_id").on(table.categoryId)],
);

// ============================================================================
// TAGS
// ============================================================================

/**
 * Tags - Custom tags for expenses
 */
export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 7 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_tags_user_name").on(table.userId, table.name)],
);

/**
 * Expense Tags - Many-to-many relationship between expenses and tags
 */
export const expenseTags = pgTable(
  "expense_tags",
  {
    id: serial("id").primaryKey(),
    expenseId: integer("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_expense_tags_unique").on(table.expenseId, table.tagId),
    index("idx_expense_tags_expense_id").on(table.expenseId),
    index("idx_expense_tags_tag_id").on(table.tagId),
  ],
);

// ============================================================================
// GOALS
// ============================================================================

/**
 * Savings Goals - Track savings targets
 */
export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
    currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).default("0"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    targetDate: date("target_date"),
    color: varchar("color", { length: 7 }),
    icon: varchar("icon", { length: 50 }),
    isCompleted: boolean("is_completed").default(false),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_savings_goals_user_id").on(table.userId)],
);

// ============================================================================
// CHAT
// ============================================================================

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

// ============================================================================
// INVESTMENTS
// ============================================================================

/**
 * Investments - Track investment holdings (stocks, mutual funds, etc.)
 */
export const investments = pgTable(
  "investments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    portfolioId: integer("portfolio_id")
      .references(() => portfolios.id, { onDelete: "set null" }),
    symbol: varchar("symbol", { length: 20 }).notNull(), // e.g., AAPL, RELIANCE.NS
    name: varchar("name", { length: 255 }).notNull(),
    type: investmentTypeEnum("type").notNull().default("stock"),
    exchange: varchar("exchange", { length: 50 }), // e.g., NASDAQ, NSE, BSE
    sector: varchar("sector", { length: 100 }), // Technology, Healthcare, etc.
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    totalQuantity: decimal("total_quantity", { precision: 15, scale: 4 }).default("0"),
    averagePrice: decimal("average_price", { precision: 15, scale: 4 }).default("0"),
    currentPrice: decimal("current_price", { precision: 15, scale: 4 }),
    previousClose: decimal("previous_close", { precision: 15, scale: 4 }),
    dayChange: decimal("day_change", { precision: 15, scale: 4 }),
    dayChangePercent: decimal("day_change_percent", { precision: 10, scale: 2 }),
    totalInvested: decimal("total_invested", { precision: 15, scale: 2 }).default("0"),
    currentValue: decimal("current_value", { precision: 15, scale: 2 }),
    totalGainLoss: decimal("total_gain_loss", { precision: 15, scale: 2 }),
    totalGainLossPercent: decimal("total_gain_loss_percent", { precision: 10, scale: 2 }),
    dayGainLoss: decimal("day_gain_loss", { precision: 15, scale: 2 }),
    lastUpdated: timestamp("last_updated"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_investments_user_id").on(table.userId),
    index("idx_investments_portfolio_id").on(table.portfolioId),
    index("idx_investments_symbol").on(table.symbol),
    uniqueIndex("idx_investments_user_symbol").on(table.userId, table.symbol),
  ],
);

/**
 * Investment Transactions - Buy/Sell transactions for investments
 */
export const investmentTransactions = pgTable(
  "investment_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    investmentId: integer("investment_id")
      .notNull()
      .references(() => investments.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
    price: decimal("price", { precision: 15, scale: 4 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
    fees: decimal("fees", { precision: 15, scale: 2 }).default("0"),
    taxes: decimal("taxes", { precision: 15, scale: 2 }).default("0"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    date: date("date").notNull(),
    time: varchar("time", { length: 8 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_investment_transactions_user_id").on(table.userId),
    index("idx_investment_transactions_investment_id").on(table.investmentId),
    index("idx_investment_transactions_date").on(table.date),
    index("idx_investment_transactions_type").on(table.type),
  ],
);

// ============================================================================
// PORTFOLIOS
// ============================================================================

/**
 * Portfolios - Group investments into portfolios (e.g., "Retirement", "Trading")
 */
export const portfolios = pgTable(
  "portfolios",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }),
    icon: varchar("icon", { length: 50 }),
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_portfolios_user_id").on(table.userId),
    uniqueIndex("idx_portfolios_user_name").on(table.userId, table.name),
  ],
);

/**
 * Portfolio Holdings - Links investments to portfolios
 */
export const portfolioHoldings = pgTable(
  "portfolio_holdings",
  {
    id: serial("id").primaryKey(),
    portfolioId: integer("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    investmentId: integer("investment_id")
      .notNull()
      .references(() => investments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_portfolio_holdings_unique").on(table.portfolioId, table.investmentId),
    index("idx_portfolio_holdings_portfolio_id").on(table.portfolioId),
    index("idx_portfolio_holdings_investment_id").on(table.investmentId),
  ],
);

// ============================================================================
// WATCHLIST
// ============================================================================

/**
 * Watchlist - Track stocks without owning them
 */
export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: investmentTypeEnum("type").notNull().default("stock"),
    exchange: varchar("exchange", { length: 50 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    targetPrice: decimal("target_price", { precision: 15, scale: 4 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_watchlist_user_id").on(table.userId),
    uniqueIndex("idx_watchlist_user_symbol").on(table.userId, table.symbol),
  ],
);

/**
 * Price Alerts - Set alerts for specific price conditions
 */
export const priceAlerts = pgTable(
  "price_alerts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    alertType: alertTypeEnum("alert_type").notNull(),
    targetPrice: decimal("target_price", { precision: 15, scale: 4 }).notNull(),
    currentPrice: decimal("current_price", { precision: 15, scale: 4 }),
    isTriggered: boolean("is_triggered").default(false),
    triggeredAt: timestamp("triggered_at"),
    isActive: boolean("is_active").default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_price_alerts_user_id").on(table.userId),
    index("idx_price_alerts_symbol").on(table.symbol),
    index("idx_price_alerts_is_active").on(table.isActive),
  ],
);

// ============================================================================
// CHAT - CONVERSATIONS
// ============================================================================

/**
 * Conversations - Chat conversations for AI chatbot
 */
export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).default("New Conversation"),
    isArchived: boolean("is_archived").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_conversations_user_id").on(table.userId),
    index("idx_conversations_created_at").on(table.createdAt),
  ],
);

/**
 * Messages - Individual messages within a conversation
 */
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_messages_conversation_id").on(table.conversationId),
    index("idx_messages_created_at").on(table.createdAt),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
  sessions: many(sessions),
  financialAccounts: many(financialAccounts),
  categories: many(categories),
  paymentMethods: many(paymentMethods),
  expenses: many(expenses),
  budgets: many(budgets),
  tags: many(tags),
  savingsGoals: many(savingsGoals),
  conversations: many(conversations),
  investments: many(investments),
  investmentTransactions: many(investmentTransactions),
  portfolios: many(portfolios),
  watchlist: many(watchlist),
  priceAlerts: many(priceAlerts),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [financialAccounts.userId],
    references: [users.id],
  }),
  expenses: many(expenses),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "subcategories",
  }),
  children: many(categories, { relationName: "subcategories" }),
  expenses: many(expenses),
  budgets: many(budgets),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
  financialAccount: one(financialAccounts, {
    fields: [expenses.financialAccountId],
    references: [financialAccounts.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [expenses.paymentMethodId],
    references: [paymentMethods.id],
  }),
  budget: one(budgets, {
    fields: [expenses.budgetId],
    references: [budgets.id],
  }),
  parentExpense: one(expenses, {
    fields: [expenses.parentExpenseId],
    references: [expenses.id],
    relationName: "recurringInstances",
  }),
  recurringInstances: many(expenses, { relationName: "recurringInstances" }),
  expenseTags: many(expenseTags),
  expenseItems: many(expenseItems),
}));

export const expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseItems.expenseId],
    references: [expenses.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
  expenses: many(expenses),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  expenseTags: many(expenseTags),
}));

export const expenseTagsRelations = relations(expenseTags, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseTags.expenseId],
    references: [expenses.id],
  }),
  tag: one(tags, {
    fields: [expenseTags.tagId],
    references: [tags.id],
  }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  user: one(users, {
    fields: [savingsGoals.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const investmentsRelations = relations(investments, ({ one, many }) => ({
  user: one(users, {
    fields: [investments.userId],
    references: [users.id],
  }),
  portfolio: one(portfolios, {
    fields: [investments.portfolioId],
    references: [portfolios.id],
  }),
  transactions: many(investmentTransactions),
  portfolioHoldings: many(portfolioHoldings),
}));

export const investmentTransactionsRelations = relations(investmentTransactions, ({ one }) => ({
  user: one(users, {
    fields: [investmentTransactions.userId],
    references: [users.id],
  }),
  investment: one(investments, {
    fields: [investmentTransactions.investmentId],
    references: [investments.id],
  }),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  holdings: many(portfolioHoldings),
}));

export const portfolioHoldingsRelations = relations(portfolioHoldings, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [portfolioHoldings.portfolioId],
    references: [portfolios.id],
  }),
  investment: one(investments, {
    fields: [portfolioHoldings.investmentId],
    references: [investments.id],
  }),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
}));

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  user: one(users, {
    fields: [priceAlerts.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type NewFinancialAccount = typeof financialAccounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type ExpenseTag = typeof expenseTags.$inferSelect;
export type NewExpenseTag = typeof expenseTags.$inferInsert;
export type ExpenseItem = typeof expenseItems.$inferSelect;
export type NewExpenseItem = typeof expenseItems.$inferInsert;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type NewSavingsGoal = typeof savingsGoals.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;
export type InvestmentTransaction = typeof investmentTransactions.$inferSelect;
export type NewInvestmentTransaction = typeof investmentTransactions.$inferInsert;
export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;
export type PortfolioHolding = typeof portfolioHoldings.$inferSelect;
export type NewPortfolioHolding = typeof portfolioHoldings.$inferInsert;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type NewWatchlistItem = typeof watchlist.$inferInsert;
export type PriceAlert = typeof priceAlerts.$inferSelect;
export type NewPriceAlert = typeof priceAlerts.$inferInsert;

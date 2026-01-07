import { ToolLoopAgent, tool } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, expenses, investments, budgets, categories, financialAccounts } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, gte, lte, and, sql, sum } from "drizzle-orm";

// Create Vercel AI Gateway provider
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Define tools for the insights agent
const insightsTools = {
  getExpenseSummary: tool({
    description: "Get a summary of expenses for a given time period",
    inputSchema: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      categoryId: z.number().optional(),
    }),
    execute: async ({ startDate, endDate, categoryId }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      let conditions = [eq(expenses.userId, user.id), eq(expenses.type, "expense")];

      if (startDate) conditions.push(gte(expenses.date, startDate));
      if (endDate) conditions.push(lte(expenses.date, endDate));
      if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));

      const result = await db
        .select({
          total: sum(expenses.amount),
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .where(and(...conditions));

      return {
        totalExpenses: result[0]?.total || "0",
        transactionCount: result[0]?.count || 0,
        period: { startDate, endDate },
      };
    },
  }),

  getExpensesByCategory: tool({
    description: "Get expenses grouped by category for analysis",
    inputSchema: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(10),
    }),
    execute: async ({ startDate, endDate, limit }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      let conditions = [eq(expenses.userId, user.id), eq(expenses.type, "expense")];

      if (startDate) conditions.push(gte(expenses.date, startDate));
      if (endDate) conditions.push(lte(expenses.date, endDate));

      const result = await db
        .select({
          categoryId: expenses.categoryId,
          categoryName: categories.name,
          total: sum(expenses.amount),
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .leftJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(...conditions))
        .groupBy(expenses.categoryId, categories.name)
        .orderBy(desc(sum(expenses.amount)))
        .limit(limit);

      return result.map(row => ({
        categoryId: row.categoryId,
        categoryName: row.categoryName || "Uncategorized",
        total: row.total,
        transactionCount: row.count,
      }));
    },
  }),

  getInvestmentSummary: tool({
    description: "Get investment portfolio summary",
    inputSchema: z.object({}),
    execute: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const result = await db
        .select({
          totalInvested: sum(investments.totalInvested),
          currentValue: sum(investments.currentValue),
          totalGainLoss: sum(investments.totalGainLoss),
        })
        .from(investments)
        .where(and(eq(investments.userId, user.id), eq(investments.isActive, true)));

      return {
        totalInvested: result[0]?.totalInvested || "0",
        currentValue: result[0]?.currentValue || "0",
        totalGainLoss: result[0]?.totalGainLoss || "0",
      };
    },
  }),

  getBudgetStatus: tool({
    description: "Get budget status and spending against budgets",
    inputSchema: z.object({}),
    execute: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const budgetsWithSpending = await db
        .select({
          budgetId: budgets.id,
          budgetName: budgets.name,
          budgetAmount: budgets.amount,
          spent: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
        })
        .from(budgets)
        .leftJoin(expenses, and(
          eq(expenses.budgetId, budgets.id),
          eq(expenses.userId, user.id),
          eq(expenses.type, "expense")
        ))
        .where(eq(budgets.userId, user.id))
        .groupBy(budgets.id, budgets.name, budgets.amount);

      return budgetsWithSpending.map(budget => ({
        id: budget.budgetId,
        name: budget.budgetName,
        budgeted: budget.budgetAmount,
        spent: budget.spent,
        remaining: Number(budget.budgetAmount) - budget.spent,
        percentUsed: (budget.spent / Number(budget.budgetAmount)) * 100,
      }));
    },
  }),

  getRecentTransactions: tool({
    description: "Get recent transactions for analysis",
    inputSchema: z.object({
      limit: z.number().default(20),
      type: z.enum(["expense", "income"]).optional(),
    }),
    execute: async ({ limit, type }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      let conditions = [eq(expenses.userId, user.id)];
      if (type) conditions.push(eq(expenses.type, type));

      const transactions = await db
        .select({
          id: expenses.id,
          amount: expenses.amount,
          description: expenses.description,
          date: expenses.date,
          type: expenses.type,
          categoryName: categories.name,
          merchant: expenses.merchant,
        })
        .from(expenses)
        .leftJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(expenses.date))
        .limit(limit);

      return transactions;
    },
  }),
};

// Create the insights agent
const insightsAgent = new ToolLoopAgent({
  model: gateway("openai/gpt-4o-mini"),
  instructions: `You are a financial insights assistant that helps users understand their spending patterns, investment performance, and budget status.

Your capabilities:
- Analyze spending patterns and trends
- Provide insights on budget performance
- Help with investment analysis
- Generate financial reports and summaries
- Answer questions about financial data

Always be helpful, accurate, and provide actionable insights. Use the available tools to gather data before providing analysis. Format your responses clearly with sections and bullet points when appropriate.`,
  tools: insightsTools,
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages: uiMessages, conversationId } = await req.json();

    let activeConversationId = conversationId;

    // Create a new conversation if not provided
    if (!activeConversationId) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: user.id,
          title: uiMessages[0]?.content?.slice(0, 50) || "Financial Insights",
        })
        .returning();
      activeConversationId = newConversation.id;
    }

    // Get the last user message
    const lastUserMessage = uiMessages[uiMessages.length - 1];

    // Save the user message to database
    if (lastUserMessage?.role === "user") {
      await db.insert(messages).values({
        conversationId: activeConversationId,
        role: "user",
        content: lastUserMessage.content,
      });

      // Update conversation updatedAt to bring it to top
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, activeConversationId));
    }

    const abortController = new AbortController();

    // Convert messages to the format expected by the agent
    const agentMessages = uiMessages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = await insightsAgent.stream({
      messages: agentMessages,
      abortSignal: abortController.signal,
    });

    let fullText = '';

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullText += chunk;
            // Send the chunk as plain text (similar to chat API)
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();

          // Save the assistant response to database after streaming
          await db.insert(messages).values({
            conversationId: activeConversationId,
            role: "assistant",
            content: fullText,
          });

          // Update conversation updatedAt to bring it to top
          await db
            .update(conversations)
            .set({
              title: lastUserMessage?.content?.slice(0, 50) || "Financial Insights",
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, activeConversationId));
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': String(activeConversationId),
      },
    });
  } catch (error) {
    console.error("Insights API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (conversationId) {
      // Get messages for a specific conversation
      const messagesData = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, parseInt(conversationId)))
        .orderBy(messages.createdAt);

      return new Response(JSON.stringify(messagesData), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Get all conversations for the user
      const conversationsData = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, user.id))
        .orderBy(desc(conversations.updatedAt));

      return new Response(JSON.stringify(conversationsData), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Insights API GET error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return new Response("Conversation ID required", { status: 400 });
    }

    // Delete messages first
    await db
      .delete(messages)
      .where(eq(messages.conversationId, parseInt(conversationId)));

    // Delete conversation
    await db
      .delete(conversations)
      .where(and(
        eq(conversations.id, parseInt(conversationId)),
        eq(conversations.userId, user.id)
      ));

    return new Response("Conversation deleted", { status: 200 });
  } catch (error) {
    console.error("Insights API DELETE error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
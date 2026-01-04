import { streamText } from "ai";
import { createGateway } from "@ai-sdk/gateway";

import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// Create Vercel AI Gateway provider
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages: chatMessages, conversationId } = await req.json();

    let activeConversationId = conversationId;

    // Create a new conversation if not provided
    if (!activeConversationId) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: user.id,
          title: chatMessages[0]?.content?.slice(0, 50) || "New Conversation",
        })
        .returning();
      activeConversationId = newConversation.id;
    }

    // Get the last user message
    const lastUserMessage = chatMessages[chatMessages.length - 1];
    
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

    const result = streamText({
      model: gateway("openai/gpt-4o-mini"),
      messages: chatMessages,
      onFinish: async ({ text }) => {
        // Save the assistant response to database
        await db.insert(messages).values({
          conversationId: activeConversationId,
          role: "assistant",
          content: text,
        });

        // Update conversation title if it's the first message, and always update updatedAt
        await db
          .update(conversations)
          .set({
            ...(chatMessages.length === 1
              ? { title: lastUserMessage?.content?.slice(0, 50) || "New Conversation" }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, activeConversationId));
      },
    });

    const response = result.toTextStreamResponse();
    response.headers.set("X-Conversation-Id", String(activeConversationId));
    return response;
  } catch (error) {
    console.error("Chat API error:", error);
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
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, parseInt(conversationId)))
        .orderBy(messages.createdAt);

      return Response.json(conversationMessages);
    }

    // Get all conversations for the user
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.updatedAt));

    return Response.json(userConversations);
  } catch (error) {
    console.error("Chat API error:", error);
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

    // Verify the conversation belongs to the user
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, parseInt(conversationId)));

    if (!conversation || conversation.userId !== user.id) {
      return new Response("Not found", { status: 404 });
    }

    // Delete the conversation (messages will cascade)
    await db.delete(conversations).where(eq(conversations.id, parseInt(conversationId)));

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, Loader2, PanelLeftClose, PanelLeftOpen, Plus, Send, Trash2, User, MessageSquare, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const userAvatar = session?.user?.image;
  const userName = session?.user?.name || "User";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase();

  const truncateTitle = (title: string) => {
    const maxLength = 40;
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength - 6) + "......";
  };

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/chat");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadMessages = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(
          data.map((msg: { id: number; role: string; content: string }) => ({
            id: String(msg.id),
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    loadMessages(conversation.id);
  };

  const handleDeleteConversation = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setConversations(conversations.filter((c) => c.id !== conversationId));
        if (activeConversationId === conversationId) {
          handleNewConversation();
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    // Add placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`;
    setMessages([...updatedMessages, { id: assistantId, role: "assistant", content: "" }]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId: activeConversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Get conversation ID from header
      const newConversationId = response.headers.get("X-Conversation-Id");
      if (newConversationId && !activeConversationId) {
        setActiveConversationId(parseInt(newConversationId));
      }

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            )
          );
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to send message:", error);
        // Remove the placeholder message on error
        setMessages(updatedMessages);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      loadConversations();
    }
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    // Scroll to bottom whenever messages change or during streaming
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };

    scrollToBottom();
    
    // Also scroll during streaming with a slight delay to ensure content is rendered
    if (isLoading) {
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isLoading]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="@container/main flex h-[calc(100vh-3rem)] -m-4 md:-m-6 gap-0 overflow-hidden bg-background">
      {/* Sidebar - Conversation List */}
      <Card className={cn(
        "hidden flex-shrink-0 md:flex md:flex-col gap-0 transition-all duration-300 ease-in-out overflow-hidden rounded-none border-y-0 border-l-0 shadow-none p-0 bg-muted/10",
        isSidebarOpen ? "w-80 border-r" : "w-0 border-none opacity-0"
      )}>
        <div className="flex items-center justify-between border-b px-4 py-3 shrink-0 h-[52px] bg-background">
          <h2 className="font-bold text-sm tracking-tight">Chat History</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsSidebarOpen(false)}
              title="Collapse sidebar"
              className="hidden md:flex h-8 w-8"
            >
              <PanelLeftClose className="size-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
        
        <div className="p-3 shrink-0">
          <Button
            onClick={handleNewConversation}
            className="w-full justify-start gap-2 h-10 shadow-sm"
            variant="outline"
          >
            <Plus className="size-4" />
            <span className="text-sm font-medium">New Conversation</span>
          </Button>
        </div>

        <ScrollArea className="flex-1 overflow-visible">
          <div className="px-3 pb-4">
            {isLoadingConversations ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-primary/50" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="size-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-xs font-medium">
                No conversations yet
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center rounded-lg py-1.5 text-sm cursor-pointer transition-all duration-200",
                    activeConversationId === conversation.id
                      ? "bg-primary/5 text-primary font-medium"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => handleSelectConversation(conversation)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleSelectConversation(conversation);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1 pr-2">{truncateTitle(conversation.title)}</span>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="bottom" 
                      align="start" 
                      className="bg-popover text-popover-foreground border shadow-md py-1.5 px-3 text-xs max-w-[280px] break-words"
                    >
                      {conversation.title}
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      "opacity-0 group-hover:opacity-100 size-6 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all",
                      activeConversationId === conversation.id && "opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conversation.id);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex flex-1 flex-col gap-0 overflow-hidden rounded-none border-none shadow-none min-h-0 p-0">
        <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0 h-[52px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {!isSidebarOpen && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsSidebarOpen(true)}
                title="Expand sidebar"
                className="h-8 w-8"
              >
                <PanelLeftOpen className="size-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleNewConversation}
                title="New conversation"
                className="h-8 w-8"
              >
                <Plus className="size-4 text-muted-foreground" />
              </Button>
            </div>
          )}
          <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="size-4 text-primary" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h2 className="font-bold text-sm truncate leading-none">
                {activeConversationId 
                  ? conversations.find(c => c.id === activeConversationId)?.title 
                  : "New Chat"}
              </h2>
            </div>
          </div>
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              {/* System Online badge removed */}
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className={cn("px-4 py-8 max-w-4xl mx-auto w-full", messages.length === 0 && "h-full")}>
            {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center space-y-6">
              <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="size-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">How can I help you today?</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg mt-4">
                {[
                  "Analyze my spending this month",
                  "How much did I spend on groceries?",
                  "Create a new budget for travel",
                  "Show my recent transactions"
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start text-left font-normal hover:bg-accent"
                    onClick={() => {
                      setInputValue(suggestion);
                    }}
                  >
                    <Sparkles className="size-3.5 mr-2 text-primary" />
                    <span className="truncate text-xs">{suggestion}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((message, index) => {
                const isStreaming = isLoading && message.id === messages[messages.length - 1]?.id && message.role === "assistant";
                return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4 group",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {message.role === "user" && !isStreaming && (
                    <Avatar className="size-8 shrink-0 border shadow-sm bg-background">
                      <AvatarImage src={userAvatar || undefined} />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "flex flex-col gap-1.5 max-w-[85%]",
                    message.role === "user" ? "items-end" : "items-start"
                  )}>
                    {!isStreaming && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          {message.role === "assistant" ? "" : ""}
                        </span>
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted/50 border rounded-tl-none"
                      )}
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      ) : (
                        <div className="chat-markdown max-w-none leading-relaxed">
                          <Streamdown
                            mode={
                              isStreaming
                                ? "streaming"
                                : "static"
                            }
                          >
                            {message.content}
                          </Streamdown>
                        </div>
                      )}
                      {isLoading && message.role === "assistant" && !message.content && (
                        <div className="flex items-center gap-2 py-1">
                          <Loader2 className="size-3.5 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground animate-pulse">Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={handleFormSubmit} className="relative flex items-end gap-2 bg-muted/50 border rounded-2xl p-2 focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message AI Assistant..."
                className="min-h-[44px] max-h-48 resize-none py-3 px-3 bg-transparent border-none shadow-none focus-visible:ring-0"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className={cn(
                  "shrink-0 h-9 w-9 rounded-xl transition-all",
                  !inputValue.trim() || isLoading ? "opacity-50" : "opacity-100"
                )}
                disabled={isLoading || !inputValue.trim()}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}

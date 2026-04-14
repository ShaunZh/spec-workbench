"use client";

import { useState, useEffect, useRef } from "react";
import { Conversation, Message, sendChatMessage, getConversationMessages } from "@/lib/api";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ChatAreaProps {
  conversation: Conversation | null;
  onMessageSent?: () => void;
}

export function ChatArea({ conversation, onMessageSent }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Use ref to store accumulated content (avoids closure issue in async)
  const fullContentRef = useRef("");

  // Load historical messages when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const history = await getConversationMessages(conversation.id);
        setMessages(history);
      } catch (error) {
        console.error("Failed to load message history:", error);
        setMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [conversation]);

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!conversation || !inputValue.trim() || isLoading) return;

    const content = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    setStreamingContent("");
    fullContentRef.current = ""; // Reset ref

    // Generate unique temp IDs using timestamp
    const tempUserMsgId = `temp-user-${Date.now()}`;
    const tempAssistantMsgId = `temp-assistant-${Date.now()}`;

    // Add user message immediately to display
    const tempUserMsg: Message = {
      id: tempUserMsgId as unknown as number, // Use string as unique key
      conversation_id: conversation.id,
      role: "user",
      content: content,
      message_type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await sendChatMessage(conversation.id, content, (chunk) => {
        fullContentRef.current += chunk; // Accumulate in ref
        setStreamingContent(fullContentRef.current); // Update state for display
      });

      // After streaming completes, add the assistant message using ref value
      const tempAssistantMsg: Message = {
        id: tempAssistantMsgId as unknown as number, // Use string as unique key
        conversation_id: conversation.id,
        role: "assistant",
        content: fullContentRef.current, // Use ref, not state
        message_type: "text",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistantMsg]);
      setStreamingContent("");

      onMessageSent?.();
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove the temporary user message on error
      setMessages((prev) => prev.filter((m) => m.id !== (tempUserMsgId as unknown as number)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col bg-[#0f0f0f]">
        <div className="flex-1 flex items-center justify-center text-[#555] text-sm">
          Select a conversation to start chatting
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f0f]">
      <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
        {conversation.title}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory && (
          <div className="flex items-center justify-center text-[#555] text-sm h-full">
            Loading messages...
          </div>
        )}

        {!isLoadingHistory && messages.length === 0 && !streamingContent && (
          <div className="flex items-center justify-center text-[#555] text-sm h-full">
            No messages yet. Start a conversation.
          </div>
        )}

        {!isLoadingHistory && messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-[#7c6ff7] text-white"
                  : "bg-[#1a1a2e] text-[#e0e0e0] border border-[#2a2a3e]"
              }`}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg text-sm bg-[#1a1a2e] text-[#e0e0e0] border border-[#2a2a3e]">
              <MarkdownRenderer content={streamingContent} />
              <span className="inline-block w-2 h-4 bg-[#7c6ff7] animate-pulse ml-1" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-[#2a2a3e]">
        <textarea
          ref={textareaRef}
          className="w-full p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-[#e0e0e0] text-sm resize-none min-h-[48px] focus:outline-none focus:border-[#7c6ff7]"
          placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <div className="flex justify-end mt-2">
          <button
            className="px-4 py-2 bg-[#7c6ff7] text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

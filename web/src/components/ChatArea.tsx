"use client";

import { Conversation } from "@/lib/api";

interface ChatAreaProps {
  conversation: Conversation | null;
}

export function ChatArea({ conversation }: ChatAreaProps) {
  return (
    <div className="flex-1 flex flex-col bg-[#0f0f0f]">
      <div className="p-3 border-b border-[#2a2a3e] text-sm font-semibold text-[#bbb]">
        {conversation?.title || "No conversation selected"}
      </div>
      <div className="flex-1 flex items-center justify-center text-[#555] text-sm">
        No messages yet. Start a conversation.
      </div>
      <div className="p-4 border-t border-[#2a2a3e]">
        <textarea
          className="w-full p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-[#e0e0e0] text-sm resize-none min-h-[48px]"
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}
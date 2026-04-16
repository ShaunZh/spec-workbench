"use client";

import { useState, useEffect } from "react";
import { ConversationList } from "@/components/ConversationList";
import { ChatArea } from "@/components/ChatArea";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { getConversation, Conversation } from "@/lib/api";

export default function Home() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  // Fetch conversation details when selectedId changes
  useEffect(() => {
    if (selectedId === null) {
      setSelectedConversation(null);
      return;
    }

    const fetchConversation = async () => {
      try {
        const data = await getConversation(selectedId);
        setSelectedConversation(data);
      } catch (error) {
        console.error("Failed to fetch conversation:", error);
        setSelectedConversation(null);
      }
    };

    fetchConversation();
  }, [selectedId]);

  // Refresh conversation after message sent
  const handleMessageSent = async () => {
    if (selectedId) {
      try {
        const data = await getConversation(selectedId);
        setSelectedConversation(data);
      } catch (error) {
        console.error("Failed to refresh conversation:", error);
      }
    }
  };

  return (
    <main className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-12 bg-[#1a1a2e] border-b border-[#2a2a3e] flex items-center px-4">
        <span className="font-bold text-[#7c6ff7]">ReqPilot</span>
        <div className="ml-auto flex gap-2">
          <button className="px-3 py-1 bg-[#7c6ff7] text-white text-xs rounded-md border-none">
            Chat
          </button>
          <button className="px-3 py-1 text-[#aaa] text-xs rounded-md border border-[#3a3a5e] bg-transparent">
            Analysis
          </button>
        </div>
      </div>
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ConversationList
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNewConversation={() => {
            // Will be used for clearing analysis state
          }}
        />
        <ChatArea conversation={selectedConversation} onMessageSent={handleMessageSent} />
        <AnalysisPanel />
      </div>
    </main>
  );
}

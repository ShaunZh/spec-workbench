"use client";

import { useState, useEffect } from "react";
import { getConversations, createConversation, Conversation } from "@/lib/api";

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const newConv = await createConversation("New Chat");
      setConversations([newConv, ...conversations]);
      setSelectedId(newConv.id);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    if (diffDays < 7) return `${diffDays} day ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="w-[260px] bg-[#14141f] border-r border-[#2a2a3e] flex items-center justify-center">
        <span className="text-[#666] text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-[260px] bg-[#14141f] border-r border-[#2a2a3e] flex flex-col">
      <div
        className="m-3 p-2 bg-[#2a2a3e] border border-dashed border-[#3a3a5e] rounded-md text-[#aaa] text-sm text-center cursor-pointer hover:bg-[#3a3a5e]"
        onClick={handleNewChat}
      >
        + New Chat
      </div>
      <ul className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <li
            key={conv.id}
            className={`p-3 border-b border-[#1e1e30] cursor-pointer hover:bg-[#1e1e30] ${
              selectedId === conv.id
                ? "bg-[#2a2a4e] border-l-2 border-l-[#7c6ff7]"
                : ""
            }`}
            onClick={() => setSelectedId(conv.id)}
          >
            <div className="text-sm font-medium text-[#ddd] truncate">
              {conv.title}
            </div>
            <div className="text-xs text-[#666] mt-1">
              {formatTime(conv.updated_at)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
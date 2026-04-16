"use client";

import { useState, useEffect } from "react";
import {
  getConversations,
  createConversation,
  Conversation,
} from "@/lib/api";

interface ConversationListProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNewConversation?: (conv: Conversation) => void;
}

export function ConversationList({
  selectedId,
  onSelect,
  onNewConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModePicker, setShowModePicker] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      if (data.length > 0 && selectedId === null) {
        onSelect(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChatClick = () => {
    setShowModePicker(true);
  };

  const handleCreateConversation = async (mode: string) => {
    setShowModePicker(false);
    try {
      const newConv = await createConversation("New Chat", mode);
      setConversations([newConv, ...conversations]);
      onSelect(newConv.id);
      onNewConversation?.(newConv);
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
      <div className="m-3">
        {!showModePicker ? (
          <div
            className="p-2 bg-[#2a2a3e] border border-dashed border-[#3a3a5e] rounded-md text-[#aaa] text-sm text-center cursor-pointer hover:bg-[#3a3a5e]"
            onClick={handleNewChatClick}
          >
            + New Chat
          </div>
        ) : (
          <div className="p-2 bg-[#2a2a3e] border border-dashed border-[#3a3a5e] rounded-md text-[#aaa] text-xs">
            <div className="mb-2 font-medium">Choose mode:</div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-1.5 bg-[#7c6ff7] text-white rounded cursor-pointer hover:bg-[#6c5ee7]"
                onClick={() => handleCreateConversation("chat")}
              >
                Chat
              </button>
              <button
                className="flex-1 py-1.5 bg-[#2a2a3e] border border-[#7c6ff7] text-[#aaa] rounded cursor-pointer hover:bg-[#3a3a5e]"
                onClick={() => handleCreateConversation("analysis")}
              >
                Analysis
              </button>
            </div>
            <button
              className="w-full mt-2 py-1 text-[#666] cursor-pointer hover:text-[#888]"
              onClick={() => setShowModePicker(false)}
            >
              Cancel
            </button>
          </div>
        )}
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
            onClick={() => onSelect(conv.id)}
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

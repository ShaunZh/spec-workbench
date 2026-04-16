"use client";

import { useState, useEffect } from "react";
import { ConversationList } from "@/components/ConversationList";
import { ChatArea } from "@/components/ChatArea";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { getConversation, Conversation, AnalysisResult } from "@/lib/api";

export default function Home() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Fetch conversation details when selectedId changes
  useEffect(() => {
    if (selectedId === null) {
      setSelectedConversation(null);
      setAnalysisResult(null);
      setAnalysisError(null);
      return;
    }

    const fetchConversation = async () => {
      try {
        const data = await getConversation(selectedId);
        setSelectedConversation(data);
        setAnalysisResult(null);
        setAnalysisError(null);
      } catch (error) {
        console.error("Failed to fetch conversation:", error);
        setSelectedConversation(null);
      }
    };

    fetchConversation();
  }, [selectedId]);

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
          {selectedConversation?.mode === "analysis" && (
            <span className="text-xs text-[#7c6ff7] px-2 py-1 bg-[#2a2a4e] rounded">
              Analysis Mode
            </span>
          )}
        </div>
      </div>
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ConversationList
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNewConversation={() => {
            setAnalysisResult(null);
            setAnalysisError(null);
          }}
        />
        <ChatArea
          conversation={selectedConversation}
          onMessageSent={handleMessageSent}
          onAnalysisResult={(result) => {
            setAnalysisResult(result);
            setAnalysisError(null);
          }}
          onAnalysisError={(msg) => {
            setAnalysisError(msg);
          }}
        />
        <AnalysisPanel
          conversationId={selectedId}
          liveResult={analysisResult}
        />
      </div>
      {/* Analysis error toast */}
      {analysisError && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-[#5a2727] border border-[#8a3a3a] rounded-lg text-xs text-[#e0e0e0]">
          Analysis failed: {analysisError}
          <button
            className="ml-2 text-[#f59e0b] underline"
            onClick={() => setAnalysisError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </main>
  );
}

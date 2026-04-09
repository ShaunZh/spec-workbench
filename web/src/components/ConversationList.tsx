"use client";

interface Conversation {
  id: number;
  title: string;
  updated_at: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 1, title: "User authentication flow", updated_at: "2 min ago" },
  { id: 2, title: "Bug: checkout timeout", updated_at: "1 hour ago" },
  { id: 3, title: "Dashboard redesign notes", updated_at: "Yesterday" },
  { id: 4, title: "Customer feedback batch #3", updated_at: "2 days ago" },
];

export function ConversationList() {
  return (
    <div className="w-[260px] bg-[#14141f] border-r border-[#2a2a3e] flex flex-col">
      <div className="m-3 p-2 bg-[#2a2a3e] border border-dashed border-[#3a3a5e] rounded-md text-[#aaa] text-sm text-center cursor-pointer">
        + New Chat
      </div>
      <ul className="flex-1 overflow-y-auto">
        {MOCK_CONVERSATIONS.map((conv, idx) => (
          <li
            key={conv.id}
            className={`p-3 border-b border-[#1e1e30] cursor-pointer hover:bg-[#1e1e30] ${
              idx === 0 ? "bg-[#2a2a4e] border-l-2 border-l-[#7c6ff7]" : ""
            }`}
          >
            <div className="text-sm font-medium text-[#ddd] truncate">
              {conv.title}
            </div>
            <div className="text-xs text-[#666] mt-1">{conv.updated_at}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Conversation {
  id: number;
  title: string;
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  message_type: string;
  created_at: string;
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function createConversation(
  title: string,
  mode: string = "chat"
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, mode }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function getConversation(id: number): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function getConversationMessages(id: number): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/conversations/${id}/messages`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function sendChatMessage(
  conversationId: number,
  content: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, content }),
  });

  if (!res.ok) {
    throw new Error("Failed to send message");
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          return;
        }
        if (data.startsWith("[ERROR]")) {
          throw new Error(data.slice(8));
        }
        onChunk(data);
      }
    }
  }
}

"use client";

import { useState } from "react";
import { ArtifactCard } from "./ArtifactCard";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  toolCalls?: Array<{ name: string; input: unknown }>;
  artifacts?: Record<string, unknown>[];
  isError?: boolean;
}

const SUGGESTIONS = [
  "New inquiry from Sharada Engineering: 200 pcs bracket, MS 3mm, DXF attached, needed in 3 weeks",
  "Prepare a quote for inquiry INQ-0003",
  "Draft an advance follow-up WhatsApp for INQ-0002",
  "Show me the open inquiries pipeline",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  async function send(prompt: string) {
    if (!prompt.trim() || pending) return;
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId }),
      });
      const data = (await res.json()) as {
        conversationId: string;
        text?: string;
        toolCalls?: Array<{ name: string; input: unknown }>;
        artifacts?: Record<string, unknown>[];
        isError?: boolean;
        error?: string;
      };
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.error ? `Error: ${data.error}` : data.text || "(no text response)",
          toolCalls: data.toolCalls,
          artifacts: data.artifacts,
          isError: Boolean(data.error) || data.isError,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Request failed: ${(err as Error).message}`, isError: true },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1rem" }}>
      {messages.length === 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ color: "#666" }}>Try one of these, or type your own:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  textAlign: "left",
                  padding: "0.6rem 0.8rem",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%" }}>
            <div
              style={{
                background: m.role === "user" ? "#0969da" : m.isError ? "#ffebe9" : "#f0f2f5",
                color: m.role === "user" ? "white" : "black",
                borderRadius: 10,
                padding: "0.6rem 0.9rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
            {m.toolCalls && m.toolCalls.length > 0 && (
              <div style={{ fontSize: "0.75em", color: "#999", marginTop: "0.25rem" }}>
                tools used: {m.toolCalls.map((t) => t.name.replace("mcp__erp__", "")).join(", ")}
              </div>
            )}
            {m.artifacts?.map((a, j) => <ArtifactCard key={j} artifact={a} />)}
          </div>
        ))}
        {pending && <div style={{ color: "#999" }}>Agent is working…</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the ERP agent..."
          style={{ flex: 1, padding: "0.6rem", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{ padding: "0.6rem 1.2rem", borderRadius: 6, border: 0, background: "#0969da", color: "white" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

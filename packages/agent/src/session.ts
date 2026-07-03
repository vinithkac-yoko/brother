import { query } from "@anthropic-ai/claude-agent-sdk";
import { createErpToolServer, preToolUseHook } from "@fab-erp/tools";
import type { Actor } from "@fab-erp/shared";
import { SYSTEM_PROMPT } from "./systemPrompt";

export interface AgentToolCall {
  name: string;
  input: unknown;
}

export interface AgentTurnResult {
  text: string;
  toolCalls: AgentToolCall[];
  artifacts: Record<string, unknown>[];
  isError: boolean;
  errorMessage?: string;
}

function extractToolResultJson(content: unknown): unknown {
  if (!Array.isArray(content)) return undefined;
  for (const block of content) {
    if (block && typeof block === "object" && (block as { type?: string }).type === "text") {
      const text = (block as { text?: string }).text;
      if (!text) continue;
      try {
        return JSON.parse(text);
      } catch {
        // not JSON — a plain-text tool result, skip
      }
    }
  }
  return undefined;
}

// Runs one agent turn to completion and returns the assembled result. Not
// token-streamed to the caller (see claude-progress.md "Known issues" for
// why) — the API route gets one response once the agent is done reasoning
// and calling tools, which for Phase 1's inquiry/quote/message flows is
// well within a demo-acceptable latency.
export async function runAgentTurn(params: {
  prompt: string;
  conversationId: string;
  cwd: string;
}): Promise<AgentTurnResult> {
  const actor: Actor = { type: "AGENT", conversationId: params.conversationId };
  const toolServer = createErpToolServer(actor);

  let text = "";
  const toolCalls: AgentToolCall[] = [];
  const artifacts: Record<string, unknown>[] = [];
  let isError = false;
  let errorMessage: string | undefined;

  const stream = query({
    prompt: params.prompt,
    options: {
      cwd: params.cwd,
      systemPrompt: SYSTEM_PROMPT,
      permissionMode: "dontAsk",
      tools: [],
      mcpServers: { erp: toolServer },
      hooks: { PreToolUse: [{ hooks: [preToolUseHook] }] },
      model: process.env.FAB_ERP_AGENT_MODEL ?? "claude-sonnet-5",
    },
  });

  for await (const message of stream) {
    if (message.type === "assistant") {
      const content = message.message.content;
      for (const block of content) {
        if (block.type === "text") {
          text += block.text;
        } else if (block.type === "tool_use") {
          toolCalls.push({ name: block.name, input: block.input });
        }
      }
    } else if (message.type === "user") {
      const parsed = extractToolResultJson((message.message as { content?: unknown }).content);
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        // propose_transaction / draft_message tag their own top-level type;
        // execute_approved nests the shaped artifact under `artifact`.
        if (typeof record.type === "string") {
          artifacts.push(record);
        } else if (record.artifact && typeof record.artifact === "object") {
          const artifact = record.artifact as Record<string, unknown>;
          if (typeof artifact.type === "string") {
            artifacts.push(artifact);
          }
        }
      }
    } else if (message.type === "result") {
      if (message.subtype === "success") {
        text = text || message.result;
      } else {
        isError = true;
        errorMessage = message.subtype;
      }
    }
  }

  return { text, toolCalls, artifacts, isError, errorMessage };
}

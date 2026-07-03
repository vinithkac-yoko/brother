import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { runAgentTurn } from "@fab-erp/agent";

// The Agent SDK spawns a subprocess — needs the Node runtime, not Edge.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string; conversationId?: string };
  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const conversationId = body.conversationId ?? randomUUID();

  try {
    const result = await runAgentTurn({ prompt, conversationId, cwd: process.cwd() });
    return NextResponse.json({ conversationId, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ conversationId, error: message }, { status: 500 });
  }
}

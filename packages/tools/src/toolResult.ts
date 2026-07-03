import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Token-efficiency requirement from CLAUDE.md: ~25k token cap per response.
// A rough char budget stands in for a real tokenizer here — good enough to
// stop a runaway list from blowing the context window.
const MAX_RESPONSE_CHARS = 100_000;

export function jsonResult(data: unknown): CallToolResult {
  let text = JSON.stringify(data, null, 2);
  if (text.length > MAX_RESPONSE_CHARS) {
    text = JSON.stringify(
      { truncated: true, note: "Response exceeded the size cap; narrow your filters/pagination.", preview: text.slice(0, MAX_RESPONSE_CHARS) },
      null,
      2,
    );
  }
  return { content: [{ type: "text", text }] };
}

// Actionable errors per CLAUDE.md: name what was wrong AND what to do
// instead, e.g. "material_id not found; use search_records entity=material".
export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

// Layer 2: core services wrapped as Agent SDK custom tools, in-process
// (NOT MCP). 6 tools only.

export { createErpToolServer, buildErpTools } from "./tools";
export { preToolUseHook } from "./hooks";
export { ACTIONS, isKnownAction } from "./actions";
export type { ActionDefinition, ActionName } from "./actions";
export { SEARCHABLE_ENTITIES, isSearchableEntity } from "./entities";

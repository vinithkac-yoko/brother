import type { Actor } from "@fab-erp/shared";

// Phase 1 has stubbed roles, no real auth (see CLAUDE.md). Every UI-
// initiated write is attributed to this single demo admin user until a
// real login exists.
export const DEMO_USER_ACTOR: Actor = { type: "USER", userId: "demo-admin", role: "ADMIN" };

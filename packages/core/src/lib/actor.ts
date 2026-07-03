import type { Actor, Role } from "@fab-erp/shared";
import { PermissionError } from "./errors";

// Real auth is out of scope for Phase 1 (stubbed roles only — see
// CLAUDE.md). This is deliberately thin: a role-membership check for the
// handful of services where it matters, not a policy engine. The agent's
// authority comes from the propose_transaction -> Approval ->
// execute_approved path enforced at the tool layer, so AGENT actors pass
// through here uncontested; core still records who/what acted via
// actorAuditFields for AuditEvent.
export function requireRole(actor: Actor, allowed: Role[]): void {
  if (actor.type === "AGENT") return;
  if (!allowed.includes(actor.role)) {
    throw new PermissionError(
      `Role ${actor.role} is not permitted to perform this action (requires one of: ${allowed.join(", ")})`,
    );
  }
}

export function actorAuditFields(actor: Actor): { actorType: "USER" | "AGENT"; actorId: string | null } {
  if (actor.type === "USER") {
    return { actorType: "USER", actorId: actor.userId };
  }
  return { actorType: "AGENT", actorId: actor.conversationId ?? null };
}

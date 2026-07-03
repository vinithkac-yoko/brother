// Every service call is attributed to an actor for AuditEvent + permission
// checks. A human user has a role; the agent doesn't (its authority comes
// entirely from having gone through propose_transaction -> Approval ->
// execute_approved, enforced at the tool layer, not here).
import { z } from "zod";
import { roleSchema } from "./enums.js";

export const actorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("USER"), userId: z.string().min(1), role: roleSchema }),
  z.object({ type: z.literal("AGENT"), conversationId: z.string().min(1).optional() }),
]);
export type Actor = z.infer<typeof actorSchema>;

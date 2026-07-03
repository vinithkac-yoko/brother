import type { Actor, CreateMessageDraftInput } from "@fab-erp/shared";
import { createMessageDraftSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma";
import { writeAuditEvent } from "../lib/audit";

// Non-monetary, low-risk by construction (it only ever creates a draft,
// never sends anything) — no requireRole gate needed beyond being a known
// actor.
export async function createMessageDraft(actor: Actor, input: CreateMessageDraftInput) {
  const data = createMessageDraftSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const draft = await tx.messageDraft.create({ data });
    await writeAuditEvent(tx, {
      actor,
      action: "message_draft.create",
      entity: "MessageDraft",
      entityId: draft.id,
      after: draft,
    });
    return draft;
  });
}

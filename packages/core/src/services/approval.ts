import type { Actor, DecideApprovalInput } from "@fab-erp/shared";
import { decideApprovalSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma";
import { writeAuditEvent } from "../lib/audit";
import { requireRole } from "../lib/actor";
import { BusinessRuleError, NotFoundError } from "../lib/errors";

// The one write that legitimately happens directly from the UI rather than
// through the agent: a human deciding a pending Approval. This is the
// human-in-the-loop step itself, not a CRUD action the agent could do.
export async function decideApproval(actor: Actor, input: DecideApprovalInput) {
  requireRole(actor, ["ADMIN"]);
  const { approvalId, decision } = decideApprovalSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const before = await tx.approval.findUnique({ where: { id: approvalId } });
    if (!before) throw new NotFoundError("Approval", approvalId);
    if (before.status !== "PENDING") {
      throw new BusinessRuleError(`Approval ${approvalId} is ${before.status}, expected PENDING`);
    }

    const after = await tx.approval.update({
      where: { id: approvalId },
      data: {
        status: decision,
        decidedAt: new Date(),
        decidedById: actor.type === "USER" ? actor.userId : null,
      },
    });

    await writeAuditEvent(tx, {
      actor,
      action: "approval.decide",
      entity: "Approval",
      entityId: approvalId,
      before,
      after,
    });
    return after;
  });
}

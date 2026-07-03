import type {
  Actor,
  CompleteFeasibilityCheckInput,
  CreateFeasibilityCheckInput,
} from "@fab-erp/shared";
import { completeFeasibilityCheckSchema, createFeasibilityCheckSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma.js";
import { writeAuditEvent } from "../lib/audit.js";
import { requireRole } from "../lib/actor.js";
import { BusinessRuleError, NotFoundError } from "../lib/errors.js";

export async function createFeasibilityCheck(actor: Actor, input: CreateFeasibilityCheckInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const data = createFeasibilityCheckSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({ where: { id: data.inquiryId } });
    if (!inquiry || inquiry.deletedAt) throw new NotFoundError("Inquiry", data.inquiryId);
    if (inquiry.status === "WON" || inquiry.status === "LOST") {
      throw new BusinessRuleError(
        `Inquiry ${inquiry.inquiryNumber} is already ${inquiry.status}`,
      );
    }

    const check = await tx.feasibilityCheck.create({ data });
    if (inquiry.status === "NEW" || inquiry.status === "REVIEWING") {
      await tx.inquiry.update({ where: { id: inquiry.id }, data: { status: "FEASIBILITY" } });
    }

    await writeAuditEvent(tx, {
      actor,
      action: "feasibility_check.create",
      entity: "FeasibilityCheck",
      entityId: check.id,
      after: check,
    });
    return check;
  });
}

export async function completeFeasibilityCheck(actor: Actor, input: CompleteFeasibilityCheckInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const {
    feasibilityCheckId,
    riskLevel,
    estProductionDays,
    missingInfo,
    outsourcingNeeded,
    outsourcingNotes,
    completedBy,
  } = completeFeasibilityCheckSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const before = await tx.feasibilityCheck.findUnique({ where: { id: feasibilityCheckId } });
    if (!before || before.deletedAt) throw new NotFoundError("FeasibilityCheck", feasibilityCheckId);
    if (before.isComplete) {
      throw new BusinessRuleError(`FeasibilityCheck ${feasibilityCheckId} is already complete`);
    }

    const after = await tx.feasibilityCheck.update({
      where: { id: feasibilityCheckId },
      data: {
        riskLevel,
        estProductionDays,
        missingInfo,
        outsourcingNeeded,
        outsourcingNotes,
        completedBy,
        completedAt: new Date(),
        isComplete: true,
      },
    });

    await writeAuditEvent(tx, {
      actor,
      action: "feasibility_check.complete",
      entity: "FeasibilityCheck",
      entityId: feasibilityCheckId,
      before,
      after,
    });
    return after;
  });
}

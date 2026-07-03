import type { Actor, ConfirmPaymentInput, RecordPaymentInput } from "@fab-erp/shared";
import { confirmPaymentSchema, recordPaymentSchema } from "@fab-erp/shared";
import { prisma } from "../lib/prisma.js";
import { writeAuditEvent } from "../lib/audit.js";
import { requireRole } from "../lib/actor.js";
import { BusinessRuleError, NotFoundError } from "../lib/errors.js";

export async function recordPayment(actor: Actor, input: RecordPaymentInput) {
  requireRole(actor, ["ADMIN", "ENGINEER"]);
  const { customerPOId, type, amountPaise, method, referenceNumber } =
    recordPaymentSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const customerPO = await tx.customerPO.findUnique({
      where: { id: customerPOId },
      include: { job: true },
    });
    if (!customerPO || customerPO.deletedAt) throw new NotFoundError("CustomerPO", customerPOId);

    const payment = await tx.payment.create({
      data: {
        customerPOId,
        jobId: customerPO.job?.id,
        type,
        amountPaise,
        method,
        referenceNumber,
        status: "PENDING",
      },
    });

    await writeAuditEvent(tx, {
      actor,
      action: "payment.record",
      entity: "Payment",
      entityId: payment.id,
      after: payment,
    });
    return payment;
  });
}

// CLAUDE.md mission-critical rule 3: a job cannot enter production unless
// its advance Payment.status === CONFIRMED. This is the ONLY place that
// flips Job.status to PRODUCTION_ELIGIBLE — the tool-layer PreToolUse hook
// duplicates this check as defense-in-depth, but this is the source of
// truth.
export async function confirmPayment(actor: Actor, input: ConfirmPaymentInput) {
  requireRole(actor, ["ADMIN"]);
  const { paymentId, confirmedBy } = confirmPaymentSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const before = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!before || before.deletedAt) throw new NotFoundError("Payment", paymentId);
    if (before.status !== "PENDING") {
      throw new BusinessRuleError(`Payment ${paymentId} is ${before.status}, expected PENDING`);
    }

    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "CONFIRMED", confirmedBy, confirmedAt: new Date() },
    });

    let job = null;
    if (payment.type === "ADVANCE" && payment.jobId) {
      const currentJob = await tx.job.findUnique({ where: { id: payment.jobId } });
      if (currentJob && currentJob.status === "AWAITING_ADVANCE") {
        job = await tx.job.update({
          where: { id: payment.jobId },
          data: { status: "PRODUCTION_ELIGIBLE" },
        });
      }
    }

    await writeAuditEvent(tx, {
      actor,
      action: "payment.confirm",
      entity: "Payment",
      entityId: paymentId,
      before,
      after: { payment, job },
    });
    return { payment, job };
  });
}

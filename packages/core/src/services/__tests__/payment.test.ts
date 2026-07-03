import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers";
import { confirmPayment, recordPayment } from "../payment";
import { recordCustomerPO } from "../customerPO";
import { buildQuote } from "../quote";
import { attachDrawing } from "../drawing";
import { createInquiry } from "../inquiry";
import { PermissionError } from "../../lib/errors";
import { adminActor, createTestCustomer, engineerActor, seedClientConfig } from "./factories";
import { prisma } from "../../lib/prisma";

beforeEach(async () => {
  await truncateAllTables();
  await seedClientConfig();
});

async function setupJob() {
  const customer = await createTestCustomer();
  const inquiry = await createInquiry(adminActor, {
    customerId: customer.id,
    requirementDescription: "200 pcs bracket",
    material: "MS",
    thickness: 3,
    quantity: 200,
  });
  await attachDrawing(adminActor, {
    inquiryId: inquiry.id,
    fileRef: "bracket.dxf",
    fileType: "DXF",
  });
  const quote = await buildQuote(adminActor, {
    inquiryId: inquiry.id,
    deliveryBasisNotes: "10 working days",
    lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 100000 }],
  });
  const { customerPO, job } = await recordCustomerPO(adminActor, {
    quoteId: quote.id,
    poNumber: "CUST-PO-1",
    poDate: new Date(),
  });
  return { customer, inquiry, quote, customerPO, job };
}

describe("the advance-confirmation production gate", () => {
  it("does NOT flip the job to PRODUCTION_ELIGIBLE just from recordPayment", async () => {
    const { customerPO, job } = await setupJob();
    await recordPayment(adminActor, {
      customerPOId: customerPO.id,
      type: "ADVANCE",
      amountPaise: 59000,
    });

    const jobAfter = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobAfter.status).toBe("AWAITING_ADVANCE");
  });

  it("flips the job to PRODUCTION_ELIGIBLE only once the ADVANCE payment is CONFIRMED", async () => {
    const { customerPO, job } = await setupJob();
    const payment = await recordPayment(adminActor, {
      customerPOId: customerPO.id,
      type: "ADVANCE",
      amountPaise: 59000,
    });
    expect(payment.status).toBe("PENDING");

    const { job: updatedJob } = await confirmPayment(adminActor, {
      paymentId: payment.id,
      confirmedBy: "Kasi",
    });

    expect(updatedJob?.status).toBe("PRODUCTION_ELIGIBLE");
    const jobInDb = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobInDb.status).toBe("PRODUCTION_ELIGIBLE");
  });

  it("does NOT flip the job for a confirmed FINAL payment", async () => {
    const { customerPO, job } = await setupJob();
    const payment = await recordPayment(adminActor, {
      customerPOId: customerPO.id,
      type: "FINAL",
      amountPaise: 59000,
    });
    await confirmPayment(adminActor, { paymentId: payment.id, confirmedBy: "Kasi" });

    const jobAfter = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobAfter.status).toBe("AWAITING_ADVANCE");
  });

  it("only an ADMIN can confirm a payment — ENGINEER is rejected", async () => {
    const { customerPO } = await setupJob();
    const payment = await recordPayment(adminActor, {
      customerPOId: customerPO.id,
      type: "ADVANCE",
      amountPaise: 59000,
    });

    await expect(
      confirmPayment(engineerActor, { paymentId: payment.id, confirmedBy: "Not Admin" }),
    ).rejects.toThrow(PermissionError);
  });

  it("does not re-flip a job that has already moved past AWAITING_ADVANCE", async () => {
    const { customerPO, job } = await setupJob();
    const payment = await recordPayment(adminActor, {
      customerPOId: customerPO.id,
      type: "ADVANCE",
      amountPaise: 59000,
    });
    await confirmPayment(adminActor, { paymentId: payment.id, confirmedBy: "Kasi" });
    // Simulate production having already started.
    await prisma.job.update({ where: { id: job.id }, data: { status: "IN_PRODUCTION" } });

    const secondPayment = await recordPayment(adminActor, {
      customerPOId: customerPO.id,
      type: "ADVANCE",
      amountPaise: 1000,
    });
    const { job: unchangedJob } = await confirmPayment(adminActor, {
      paymentId: secondPayment.id,
      confirmedBy: "Kasi",
    });
    expect(unchangedJob).toBeNull();
    const jobInDb = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobInDb.status).toBe("IN_PRODUCTION");
  });
});

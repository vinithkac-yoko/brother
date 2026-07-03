import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers.js";
import { recordCustomerPO } from "../customerPO.js";
import { buildQuote } from "../quote.js";
import { attachDrawing } from "../drawing.js";
import { createInquiry } from "../inquiry.js";
import { BusinessRuleError } from "../../lib/errors.js";
import { adminActor, createTestCustomer, seedClientConfig } from "./factories.js";
import { prisma } from "../../lib/prisma.js";

beforeEach(async () => {
  await truncateAllTables();
  await seedClientConfig();
});

async function setupQuotedInquiry() {
  const customer = await createTestCustomer();
  const inquiry = await createInquiry(adminActor, {
    customerId: customer.id,
    requirementDescription: "200 pcs bracket",
    material: "MS",
    thickness: 3,
    quantity: 200,
    expectedDeliveryDate: new Date("2026-08-01"),
  });
  await attachDrawing(adminActor, {
    inquiryId: inquiry.id,
    fileRef: "s3://drawings/bracket.dxf",
    fileType: "DXF",
  });
  const quote = await buildQuote(adminActor, {
    inquiryId: inquiry.id,
    deliveryBasisNotes: "10 working days",
    lineItems: [
      { process: "SHEET_LASER_CUTTING", description: "Cutting", qty: 20, unit: "meter", ratePaise: 1200 },
    ],
  });
  return { customer, inquiry, quote };
}

describe("recordCustomerPO", () => {
  it("creates the CustomerPO, accepts the quote, wins the inquiry, and spins up a Job", async () => {
    const { inquiry, quote } = await setupQuotedInquiry();

    const { customerPO, job } = await recordCustomerPO(adminActor, {
      quoteId: quote.id,
      poNumber: "CUST-PO-9981",
      poDate: new Date("2026-07-10"),
    });

    expect(customerPO.poNumber).toBe("CUST-PO-9981");
    expect(customerPO.amountPaise).toBe(quote.totalPaise);

    expect(job.jobNumber).toBe("JOB-0001");
    expect(job.status).toBe("AWAITING_ADVANCE");
    expect(job.drawingRef).toBe("s3://drawings/bracket.dxf");

    const quoteAfter = await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } });
    expect(quoteAfter.status).toBe("ACCEPTED");
    const inquiryAfter = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
    expect(inquiryAfter.status).toBe("WON");
  });

  it("refuses to record a PO against a quote that already has one", async () => {
    const { quote } = await setupQuotedInquiry();
    await recordCustomerPO(adminActor, {
      quoteId: quote.id,
      poNumber: "CUST-PO-1",
      poDate: new Date(),
    });

    await expect(
      recordCustomerPO(adminActor, {
        quoteId: quote.id,
        poNumber: "CUST-PO-2",
        poDate: new Date(),
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("refuses to record a PO when no drawing has been attached", async () => {
    const customer = await createTestCustomer();
    const inquiry = await createInquiry(adminActor, {
      customerId: customer.id,
      requirementDescription: "no drawing yet",
      material: "MS",
      thickness: 3,
      quantity: 10,
    });
    const quote = await buildQuote(adminActor, {
      inquiryId: inquiry.id,
      deliveryBasisNotes: "10 days",
      lineItems: [{ process: "OTHER", description: "x", qty: 1, unit: "lot", ratePaise: 1000 }],
    });

    await expect(
      recordCustomerPO(adminActor, {
        quoteId: quote.id,
        poNumber: "CUST-PO-1",
        poDate: new Date(),
      }),
    ).rejects.toThrow(/no Drawing attached/);
  });
});

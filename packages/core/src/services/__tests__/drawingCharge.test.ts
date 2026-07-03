import { beforeEach, describe, expect, it } from "vitest";
import { truncateAllTables } from "../../lib/testHelpers";
import {
  createDrawingCharge,
  invoiceDrawingCharge,
  markDrawingChargePaid,
  waiveDrawingCharge,
} from "../drawingCharge";
import { createInquiry, markInquiryLost } from "../inquiry";
import { BusinessRuleError } from "../../lib/errors";
import { adminActor, createTestCustomer } from "./factories";

beforeEach(async () => {
  await truncateAllTables();
});

async function setupInquiry() {
  const customer = await createTestCustomer();
  return createInquiry(adminActor, {
    customerId: customer.id,
    requirementDescription: "Custom bracket, no drawing supplied",
    material: "MS",
    thickness: 3,
    quantity: 50,
  });
}

describe("DrawingCharge lifecycle", () => {
  it("can be created and progressed to PAID regardless of the inquiry going LOST", async () => {
    const inquiry = await setupInquiry();

    const charge = await createDrawingCharge(adminActor, {
      inquiryId: inquiry.id,
      amountPaise: 150000,
      description: "CAD drawing for infeasible part",
      decidedBy: "Kasi",
    });
    expect(charge.status).toBe("PENDING");

    // The part turns out infeasible to manufacture — this must not block
    // billing for the drawing work already done.
    await markInquiryLost(adminActor, {
      inquiryId: inquiry.id,
      lostReason: "CAPABILITY_MISMATCH",
      lostReasonNotes: "Tube laser outsourcing not viable for this geometry",
    });

    const invoiced = await invoiceDrawingCharge(adminActor, { drawingChargeId: charge.id });
    expect(invoiced.status).toBe("INVOICED");

    const paid = await markDrawingChargePaid(adminActor, { drawingChargeId: charge.id });
    expect(paid.status).toBe("PAID");
  });

  it("can be waived instead of invoiced when the job proceeds to a full order", async () => {
    const inquiry = await setupInquiry();
    const charge = await createDrawingCharge(adminActor, {
      inquiryId: inquiry.id,
      amountPaise: 150000,
      decidedBy: "Kasi",
    });
    const waived = await waiveDrawingCharge(adminActor, {
      drawingChargeId: charge.id,
      notes: "Folded into the full production order",
    });
    expect(waived.status).toBe("WAIVED");
  });

  it("refuses to waive an already-PAID charge", async () => {
    const inquiry = await setupInquiry();
    const charge = await createDrawingCharge(adminActor, {
      inquiryId: inquiry.id,
      amountPaise: 100000,
      decidedBy: "Kasi",
    });
    await invoiceDrawingCharge(adminActor, { drawingChargeId: charge.id });
    await markDrawingChargePaid(adminActor, { drawingChargeId: charge.id });

    await expect(
      waiveDrawingCharge(adminActor, { drawingChargeId: charge.id }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("refuses to mark paid before invoicing", async () => {
    const inquiry = await setupInquiry();
    const charge = await createDrawingCharge(adminActor, {
      inquiryId: inquiry.id,
      amountPaise: 100000,
      decidedBy: "Kasi",
    });
    await expect(
      markDrawingChargePaid(adminActor, { drawingChargeId: charge.id }),
    ).rejects.toThrow(BusinessRuleError);
  });
});

import { describe, expect, it } from "vitest";
import { artifactSchema } from "../artifacts";
import { markInquiryLostSchema } from "../schemas/inquiry";
import { buildQuoteSchema } from "../schemas/quote";

describe("markInquiryLostSchema", () => {
  it("requires lostReasonNotes when lostReason is OTHER", () => {
    const result = markInquiryLostSchema.safeParse({
      inquiryId: "inq_1",
      lostReason: "OTHER",
    });
    expect(result.success).toBe(false);
  });

  it("accepts OTHER with notes", () => {
    const result = markInquiryLostSchema.safeParse({
      inquiryId: "inq_1",
      lostReason: "OTHER",
      lostReasonNotes: "Customer went with a competitor",
    });
    expect(result.success).toBe(true);
  });

  it("does not require notes for non-OTHER reasons", () => {
    const result = markInquiryLostSchema.safeParse({
      inquiryId: "inq_1",
      lostReason: "PRICE",
    });
    expect(result.success).toBe(true);
  });
});

describe("buildQuoteSchema", () => {
  it("rejects amountPaise as a line-item input field", () => {
    const result = buildQuoteSchema.safeParse({
      inquiryId: "inq_1",
      deliveryBasisNotes: "10 working days from advance + drawing approval",
      lineItems: [
        {
          process: "SHEET_LASER_CUTTING",
          description: "Laser cutting",
          qty: 10,
          unit: "meter",
          ratePaise: 1200,
          amountPaise: 999999,
        },
      ],
    });
    // amountPaise is simply stripped (not part of the schema), never trusted from input
    expect(result.success).toBe(true);
    expect(result.data && "amountPaise" in result.data.lineItems[0]!).toBe(false);
  });

  it("requires at least one line item", () => {
    const result = buildQuoteSchema.safeParse({
      inquiryId: "inq_1",
      deliveryBasisNotes: "10 working days",
      lineItems: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("artifactSchema", () => {
  it("discriminates message_draft artifacts", () => {
    const result = artifactSchema.safeParse({
      type: "message_draft",
      messageDraftId: "md_1",
      kind: "ADVANCE_FOLLOWUP",
      channel: "WHATSAPP",
      body: "Hi, just checking in on the advance payment for JOB-0001.",
      relatedEntity: "Job",
      relatedEntityId: "job_1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown artifact type", () => {
    const result = artifactSchema.safeParse({ type: "not_a_real_type" });
    expect(result.success).toBe(false);
  });
});

// Layer 5: the fixed set of renderable artifact types. Both apps/web and
// the agent's tool responses produce values matching this union — it's
// the contract between "what a tool call returns" and "what the UI knows
// how to draw." Do not add a 7th artifact type without updating both this
// file and the mission-critical rules in CLAUDE.md.
import { z } from "zod";
import {
  approvalStatusSchema,
  messageChannelSchema,
  messageDraftKindSchema,
  quoteProcessSchema,
  quoteStatusSchema,
  riskLevelSchema,
} from "./enums.js";

export const approvalCardArtifactSchema = z.object({
  type: z.literal("approval_card"),
  approvalId: z.string(),
  proposedAction: z.string(),
  summary: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: approvalStatusSchema,
  thresholdReason: z.string().optional(),
});
export type ApprovalCardArtifact = z.infer<typeof approvalCardArtifactSchema>;

export const quoteCardLineItemSchema = z.object({
  process: quoteProcessSchema,
  description: z.string(),
  qty: z.number(),
  unit: z.string(),
  ratePaise: z.number().int(),
  amountPaise: z.number().int(),
});

export const quoteCardArtifactSchema = z.object({
  type: z.literal("quote_card"),
  quoteId: z.string(),
  quoteNumber: z.string(),
  version: z.number().int(),
  status: quoteStatusSchema,
  lineItems: z.array(quoteCardLineItemSchema),
  subtotalPaise: z.number().int(),
  gstRatePct: z.number(),
  gstAmountPaise: z.number().int(),
  totalPaise: z.number().int(),
  validUntil: z.coerce.date(),
  paymentTermsSnapshot: z.record(z.string(), z.unknown()),
  deliveryBasisNotes: z.string(),
  transportNote: z.string(),
});
export type QuoteCardArtifact = z.infer<typeof quoteCardArtifactSchema>;

export const feasibilityChecklistArtifactSchema = z.object({
  type: z.literal("feasibility_checklist"),
  feasibilityCheckId: z.string(),
  inquiryId: z.string(),
  checklist: z.record(z.string(), z.unknown()),
  riskLevel: riskLevelSchema.nullable(),
  estProductionDays: z.number().int().nullable(),
  missingInfo: z.array(z.string()),
  outsourcingNeeded: z.boolean(),
  isComplete: z.boolean(),
});
export type FeasibilityChecklistArtifact = z.infer<typeof feasibilityChecklistArtifactSchema>;

export const jobCardRouteStageSchema = z.object({
  stage: z.string(),
  sequence: z.number().int(),
  status: z.string(),
  completedQty: z.number().int(),
  pendingQty: z.number().int(),
});

export const jobCardArtifactSchema = z.object({
  type: z.literal("job_card"),
  jobId: z.string(),
  jobNumber: z.string(),
  customerName: z.string(),
  partName: z.string(),
  quantity: z.number().int(),
  material: z.string(),
  drawingRef: z.string(),
  deliveryDate: z.coerce.date().nullable(),
  status: z.string(),
  powderCoatColor: z.string().nullable(),
  powderCoatColorConfirmed: z.boolean(),
  specialNotes: z.string().nullable(),
  route: z.array(jobCardRouteStageSchema),
  advancePaymentConfirmed: z.boolean(),
});
export type JobCardArtifact = z.infer<typeof jobCardArtifactSchema>;

export const reportViewArtifactSchema = z.object({
  type: z.literal("report_view"),
  reportName: z.string(),
  generatedAt: z.coerce.date(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
});
export type ReportViewArtifact = z.infer<typeof reportViewArtifactSchema>;

export const messageDraftArtifactSchema = z.object({
  type: z.literal("message_draft"),
  messageDraftId: z.string(),
  kind: messageDraftKindSchema,
  channel: messageChannelSchema,
  body: z.string(),
  relatedEntity: z.string(),
  relatedEntityId: z.string(),
});
export type MessageDraftArtifact = z.infer<typeof messageDraftArtifactSchema>;

// DrawingCharge deliberately does NOT get its own artifact type — the
// union stays fixed at these 6 (CLAUDE.md). A proposed DrawingCharge
// renders as approval_card like any other propose_transaction; a listing
// of them renders as report_view.
export const artifactSchema = z.discriminatedUnion("type", [
  approvalCardArtifactSchema,
  quoteCardArtifactSchema,
  feasibilityChecklistArtifactSchema,
  jobCardArtifactSchema,
  reportViewArtifactSchema,
  messageDraftArtifactSchema,
]);
export type Artifact = z.infer<typeof artifactSchema>;

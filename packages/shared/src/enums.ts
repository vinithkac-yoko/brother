// Zod enums mirroring packages/core/prisma/schema.prisma exactly. Kept as
// the single source of truth for valid string values on both sides of the
// service boundary (input validation here, Prisma write there) — if you
// add a value to a Prisma enum, add it here too, in the same order.
import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "ENGINEER", "SUPERVISOR"]);
export type Role = z.infer<typeof roleSchema>;

export const actorTypeSchema = z.enum(["USER", "AGENT"]);
export type ActorType = z.infer<typeof actorTypeSchema>;

export const inquiryStatusSchema = z.enum([
  "NEW",
  "REVIEWING",
  "FEASIBILITY",
  "QUOTED",
  "WON",
  "LOST",
]);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

export const lostReasonSchema = z.enum([
  "PRICE",
  "LEAD_TIME",
  "CAPABILITY_MISMATCH",
  "CUSTOMER_CANCELLED",
  "NO_RESPONSE",
  "OTHER",
]);
export type LostReason = z.infer<typeof lostReasonSchema>;

export const drawingFileTypeSchema = z.enum(["DXF", "SOLIDWORKS", "PDF", "CYPCUT"]);
export type DrawingFileType = z.infer<typeof drawingFileTypeSchema>;

export const drawingSourceSchema = z.enum(["CUSTOMER_SUPPLIED", "SHOP_DRAWN"]);
export type DrawingSource = z.infer<typeof drawingSourceSchema>;

export const drawingChargeStatusSchema = z.enum(["PENDING", "INVOICED", "PAID", "WAIVED"]);
export type DrawingChargeStatus = z.infer<typeof drawingChargeStatusSchema>;

export const riskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const quoteProcessSchema = z.enum([
  "RAW_MATERIAL",
  "SHEET_LASER_CUTTING",
  "TUBE_LASER_CUTTING",
  "BENDING",
  "MIG_WELDING",
  "BANDSAW_CUTTING",
  "LASER_WELDING",
  "GRINDING",
  "POWDER_COATING",
  "PACKING",
  "TRANSPORT",
  "OTHER",
]);
export type QuoteProcess = z.infer<typeof quoteProcessSchema>;

export const quoteStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "SUPERSEDED",
  "REJECTED",
  "EXPIRED",
]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const paymentTypeSchema = z.enum(["ADVANCE", "FINAL"]);
export type PaymentType = z.infer<typeof paymentTypeSchema>;

export const paymentStatusSchema = z.enum(["PENDING", "CONFIRMED"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const jobStatusSchema = z.enum([
  "CREATED",
  "AWAITING_ADVANCE",
  "PRODUCTION_ELIGIBLE",
  "IN_PRODUCTION",
  "DISPATCHED",
  "CLOSED",
  "CANCELLED",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const routeStageTypeSchema = z.enum([
  "SHEET_LASER_CUTTING",
  "TUBE_LASER_OUTSOURCING",
  "BENDING",
  "FABRICATION",
  "MIG_WELDING",
  "BANDSAW_CUTTING",
  "LASER_WELDING",
  "GRINDING",
  "POWDER_COATING",
  "PACKING",
  "DISPATCH",
]);
export type RouteStageType = z.infer<typeof routeStageTypeSchema>;

export const stageStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

export const unitSchema = z.enum(["KG", "PIECE", "METER", "SQM", "SET"]);
export type Unit = z.infer<typeof unitSchema>;

export const purchaseRequestStatusSchema = z.enum([
  "OPEN",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
]);
export type PurchaseRequestStatus = z.infer<typeof purchaseRequestStatusSchema>;

export const vendorPOStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "CONFIRMED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
]);
export type VendorPOStatus = z.infer<typeof vendorPOStatusSchema>;

export const approvalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const messageDraftKindSchema = z.enum([
  "ADVANCE_FOLLOWUP",
  "QUOTE_COVER",
  "DISPATCH_CONFIRMATION",
]);
export type MessageDraftKind = z.infer<typeof messageDraftKindSchema>;

export const messageChannelSchema = z.enum(["WHATSAPP", "EMAIL"]);
export type MessageChannel = z.infer<typeof messageChannelSchema>;

// Layer 1: ERP core service layer. Pure TypeScript, no HTTP, no React, no
// agent code. Every capability is one service function: zod input, typed
// output, permission check, AuditEvent write.

export { prisma } from "./lib/prisma";
export { NotFoundError, BusinessRuleError, PermissionError } from "./lib/errors";
export { requireRole, actorAuditFields } from "./lib/actor";
export { getClientConfig } from "./lib/clientConfig";
export { computeQuoteTotals } from "./lib/quoteMath";
export * from "./lib/ids";

export * from "./services/customer";
export * from "./services/inquiry";
export * from "./services/drawing";
export * from "./services/drawingCharge";
export * from "./services/feasibility";
export * from "./services/quote";
export * from "./services/customerPO";
export * from "./services/payment";
export * from "./services/reports";
export * from "./services/messageDraft";
export * from "./services/approval";

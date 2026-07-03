// Layer 1: ERP core service layer. Pure TypeScript, no HTTP, no React, no
// agent code. Every capability is one service function: zod input, typed
// output, permission check, AuditEvent write.

export { prisma } from "./lib/prisma.js";
export { NotFoundError, BusinessRuleError, PermissionError } from "./lib/errors.js";
export { requireRole, actorAuditFields } from "./lib/actor.js";
export { getClientConfig } from "./lib/clientConfig.js";
export { computeQuoteTotals } from "./lib/quoteMath.js";
export * from "./lib/ids.js";

export * from "./services/customer.js";
export * from "./services/inquiry.js";
export * from "./services/drawing.js";
export * from "./services/drawingCharge.js";
export * from "./services/feasibility.js";
export * from "./services/quote.js";
export * from "./services/customerPO.js";
export * from "./services/payment.js";
export * from "./services/reports.js";

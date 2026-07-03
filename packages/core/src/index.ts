// Layer 1: ERP core service layer. Pure TypeScript, no HTTP, no React, no
// agent code. Every capability is one service function: zod input, typed
// output, permission check, AuditEvent write.
//
// Populated in the "Core services + tests" milestone (see claude-progress.md).

export const FAB_ERP_CORE_VERSION = "0.1.0";

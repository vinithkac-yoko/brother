import { z } from "zod";

export const decideApprovalSchema = z.object({
  approvalId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});
export type DecideApprovalInput = z.input<typeof decideApprovalSchema>;

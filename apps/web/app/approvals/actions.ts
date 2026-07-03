"use server";

import { revalidatePath } from "next/cache";
import { decideApproval } from "@fab-erp/core";
import { DEMO_USER_ACTOR } from "../../lib/actor";

export async function approveAction(approvalId: string) {
  await decideApproval(DEMO_USER_ACTOR, { approvalId, decision: "APPROVED" });
  revalidatePath("/approvals");
}

export async function rejectAction(approvalId: string) {
  await decideApproval(DEMO_USER_ACTOR, { approvalId, decision: "REJECTED" });
  revalidatePath("/approvals");
}

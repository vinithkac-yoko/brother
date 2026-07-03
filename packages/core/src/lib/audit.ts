import type { Prisma, PrismaClient } from "@prisma/client";
import type { Actor } from "@fab-erp/shared";
import { actorAuditFields } from "./actor";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function writeAuditEvent(
  tx: Tx,
  params: {
    actor: Actor;
    action: string;
    entity: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    conversationId?: string;
  },
): Promise<void> {
  const { actorType, actorId } = actorAuditFields(params.actor);
  await tx.auditEvent.create({
    data: {
      actorType,
      actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: params.before === undefined ? undefined : (params.before as Prisma.InputJsonValue),
      after: params.after === undefined ? undefined : (params.after as Prisma.InputJsonValue),
      conversationId: params.conversationId,
    },
  });
}

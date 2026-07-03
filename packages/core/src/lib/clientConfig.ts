import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "./errors.js";

type Tx = PrismaClient | Prisma.TransactionClient;

// One ClientConfig row per deployment, seeded from CUSTOMIZE.md. Never read
// rates/terms any other way — see CLAUDE.md mission-critical rule 1.
export async function getClientConfig(tx: Tx, slug = "default") {
  const config = await tx.clientConfig.findUnique({ where: { slug } });
  if (!config) {
    throw new NotFoundError("ClientConfig", slug);
  }
  return config;
}

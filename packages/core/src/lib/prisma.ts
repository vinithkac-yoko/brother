import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __fabErpPrisma: PrismaClient | undefined;
}

// Reuse a single client across hot reloads / repeated imports in dev and
// tests instead of exhausting Postgres connections.
export const prisma = globalThis.__fabErpPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__fabErpPrisma = prisma;
}

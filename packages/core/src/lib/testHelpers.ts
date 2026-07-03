import { prisma } from "./prisma.js";

// Integration tests hit real Postgres (fab_erp_test). Truncate everything
// except the migrations table between tests rather than mocking Prisma —
// these services are thin wrappers around real queries/transactions and a
// mock would just re-assert the mock, not catch a bad query.
export async function truncateAllTables(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

// Phase 1 uses a simple count-and-pad scheme (fine for single-agent,
// low-concurrency use per CLAUDE.md conventions). If concurrent writes
// ever become a real concern, replace with a DB sequence — the call sites
// don't need to change.
async function nextSequence(tx: Tx, count: Promise<number>, prefix: string): Promise<string> {
  const n = await count;
  return `${prefix}-${String(n + 1).padStart(4, "0")}`;
}

export function generateInquiryNumber(tx: Tx): Promise<string> {
  return nextSequence(tx, tx.inquiry.count(), "INQ");
}

export function generateJobNumber(tx: Tx): Promise<string> {
  return nextSequence(tx, tx.job.count(), "JOB");
}

// New quote family: Q-0001 (version 1). Revision of an existing quote:
// same base, version bumped — Q-0001-v2, Q-0001-v3, ...
export async function generateQuoteNumber(
  tx: Tx,
  opts: { previousQuoteNumber?: string } = {},
): Promise<{ quoteNumber: string; version: number }> {
  if (opts.previousQuoteNumber) {
    const match = /^(Q-\d{4})(?:-v(\d+))?$/.exec(opts.previousQuoteNumber);
    if (!match) {
      throw new Error(`Cannot parse quote number for revision: ${opts.previousQuoteNumber}`);
    }
    const base = match[1];
    const prevVersion = match[2] ? Number(match[2]) : 1;
    const nextVersion = prevVersion + 1;
    return { quoteNumber: `${base}-v${nextVersion}`, version: nextVersion };
  }
  const n = await tx.quote.count({ where: { supersedesId: null } });
  return { quoteNumber: `Q-${String(n + 1).padStart(4, "0")}`, version: 1 };
}

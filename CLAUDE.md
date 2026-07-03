# CLAUDE.md — fab-erp-template

Agent-native ERP for custom metal fabrication job shops. Single-tenant
template: this repo is cloned per client and customized via `CUSTOMIZE.md`.
A Claude agent and the human UI are peer clients of the same headless
service layer — the agent is not a chatbot bolted onto a UI.

**Read `claude-progress.md` first in every session** — it has current
phase, what's done, what's next, and open decisions. This file (CLAUDE.md)
is architecture/conventions that don't change session to session.

## Mission-critical rules

1. **Never hardcode client-specific values** (rates, GST %, payment terms,
   stage list, approval thresholds) into `packages/core` or `packages/agent`
   code. They come from `ClientConfig`, seeded from `CUSTOMIZE.md`. If you're
   about to write a number or a business term into a `.ts` file, stop —
   it belongs in `CUSTOMIZE.md` → seed → config lookup.
2. **Money is always an integer number of paise.** Never `Decimal`/`Float`
   for currency. Field names end in `Paise`.
3. **Deterministic invariants live in services, never in prompts.** The
   agent cannot be trusted (or relied upon) to enforce business rules —
   `packages/core` services enforce them, and `packages/agent` hooks
   duplicate the check as defense-in-depth. Known hard rules:
   - A job cannot enter production (no route stage can start) unless its
     advance `Payment.status === CONFIRMED`.
   - The `POWDER_COATING` route stage is blocked unless
     `Job.powderCoatColor` is set **and** `powderCoatColorConfirmed === true`.
   - Stage `completedQty + pendingQty` can never exceed the job quantity;
     `pendingQty` is derived, not user-entered as an independent value.
   - Quote `subtotalPaise` / `gstAmountPaise` / `totalPaise` are always
     computed server-side in the quote-build service — the agent never
     computes or asserts a total, it only supplies line items.
4. **All writes go through `propose_transaction` → `Approval` →
   `execute_approved`.** The agent (and the tool layer) never mutates data
   directly. `search_records` / `get_record` / `run_report` are the only
   read paths; they never write.
5. **Soft deletes everywhere.** Every model has `deletedAt DateTime?`.
   Services filter `deletedAt: null` by default; nothing is hard-deleted.
6. **Quotes version, they don't overwrite.** Revising a quote creates a new
   `Quote` row (`version` incremented, `supersedesId` pointing at the
   previous version, previous version's `status` moves to `SUPERSEDED`).
7. **JobCard is a view, not a table.** Assembled by a core service from
   `Job` + `ProcessRoute` + `RouteStage` + `StageUpdate` + notes. Don't add
   a `JobCard` model — if you're tempted to, the assembly service is
   missing a field instead.

## Architecture (6 layers)

```
packages/shared/   Layer 5/6 groundwork — zod schemas, enums, artifact
                    discriminated union types. No runtime deps on core/tools/agent.
packages/core/      Layer 1 — pure TS service layer + Prisma schema. No HTTP,
                    no React, no agent code. Every capability = one service
                    function: zod input, typed output, permission check,
                    AuditEvent write.
packages/tools/     Layer 2 — core services wrapped as Agent SDK custom tools,
                    in-process (NOT MCP). 6 tools only (see below).
packages/agent/     Layer 3 — Claude Agent SDK runtime. Single agent in
                    Phase 1. dontAsk permission mode + PreToolUse hooks +
                    deny rules. Thin system prompt; procedural knowledge
                    lives in skills/.
skills/             Layer 4 — Agent Skills (open standard). One skill per
                    workflow (inquiry-intake, feasibility, quotation,
                    followups in Phase 1). SKILL.md < 500 lines/5k tokens;
                    deeper material in references/.
apps/web/           Next.js App Router UI. Renders the 6 artifact types.
                    Same service layer as the agent — UI calls core
                    services directly (or via the same propose/execute
                    path for writes), it does not go through the agent
                    for CRUD it can do itself.
memory/             Per-client learning dir. README only in Phase 1 — L1/L2
                    self-learning is explicitly NOT built yet.
evals/               Golden-task scenarios exercising the agent end-to-end.
```

### The 6 tools (Layer 2) — do not add a 7th without a strong reason

1. `search_records` — entity + filters + pagination + field selection.
2. `get_record` — entity + id; includes related-record summary (a Job
   returns its route, latest stage updates, payment status).
3. `run_report` — named report + params (Phase 1: open-inquiries pipeline,
   quotes-expiring-within-N-days).
4. `propose_transaction` — the *only* write path. Creates an `Approval` row.
   Low-risk non-monetary writes below a configured threshold may auto-approve;
   monetary/status-changing writes always require human approval (Phase 1
   default: ₹0 threshold — **all monetary writes require approval**).
5. `execute_approved` — executes an `Approval` whose status is `APPROVED`.
   Blocked by a `PreToolUse` hook if status isn't `APPROVED` — this is
   enforced twice (hook + service) on purpose.
6. `draft_message` — WhatsApp/email drafts (advance follow-up, quote cover,
   dispatch confirmation). Returns a `message_draft` artifact. **Never
   sends anything** — actual send integrations are out of scope entirely.

Token-efficiency requirements for every tool: paginated lists (default 20),
~25k token response cap, actionable errors (e.g. `"material_id not found;
use search_records entity=material"`), and tool descriptions written like
onboarding docs — when to use, when NOT to, examples.

### Artifact types (Layer 5, `packages/shared`)

Discriminated union, Phase 1 renders all of: `approval_card`, `quote_card`,
`feasibility_checklist`, `job_card`, `report_view`, `message_draft`.

## Commands

```bash
pnpm install                 # install all workspace deps
pnpm db:migrate               # run Prisma migrations (packages/core)
pnpm db:seed                  # seed ClientConfig + sample data
pnpm db:studio                # Prisma Studio
pnpm dev                      # turbo dev across packages/apps
pnpm build                    # turbo build
pnpm test                     # turbo test (vitest per package)
pnpm typecheck                 # turbo typecheck
pnpm lint                     # turbo lint
```

Per-package: `pnpm --filter @fab-erp/core test`, etc.

## Conventions

- TypeScript everywhere, strict mode (`tsconfig.base.json`), no `any`
  without a comment explaining why.
- Zod schemas for every service input; infer types from zod, don't hand-write
  parallel interfaces.
- Every service function: validate input (zod) → permission check → business
  logic → Prisma write → `AuditEvent` write, in that order, wrapped in a
  single Prisma transaction where the write isn't atomic already.
- IDs: `cuid()`. Human-readable numbers (`INQ-0001`, `Q-0001-v1`,
  `JOB-0001`, PO numbers) are generated by a service, not the DB.
- Tests: Vitest. Core services need a passing test before being called done
  — no exceptions, per harness rules.
- Commit small vertical slices (schema → service → test → tool → skill →
  UI), not big-bang commits.

## Where things are decided

See `claude-progress.md` → "Decisions" for the running log of product-shaping
calls made without stopping to ask (per harness rules, ambiguous non-product
decisions are made and logged, not escalated).

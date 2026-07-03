# claude-progress.md

_Last updated: 2026-07-03, session 1 (initializer)._

Read this file first every session. Update it at the end of every session
and after every milestone, per harness rules.

## Current phase

**Phase 1 — Front office: Lead → Quote → PO → Advance.** Bootstrapping the
repo. Not yet feature-complete.

## Done

- [x] Monorepo skeleton: pnpm workspaces + turborepo, `packages/{shared,core,tools,agent}`,
      `apps/web`, `skills/{inquiry-intake,feasibility,quotation,followups,_client}`,
      `memory/`, `evals/`.
- [x] Root config: `package.json`, `pnpm-workspace.yaml`, `turbo.json`,
      `tsconfig.base.json`, `.gitignore`.
- [x] Per-package `package.json` + `tsconfig.json` for shared/core/tools/agent/web
      (dependency graph wired: shared ← core ← tools ← agent; web depends on
      core/shared/agent).
- [x] `CLAUDE.md` written (architecture, mission-critical rules, commands).
- [x] `CUSTOMIZE.md` written (rate card, GST/terms, stages, lost-reason
      taxonomy, approval threshold — all placeholder/sample values for the
      template).
- [x] Full Prisma schema drafted at `packages/core/prisma/schema.prisma`
      covering every entity in the domain model (Customer, Contact, Inquiry,
      Drawing, FeasibilityCheck, Quote/QuoteLineItem, CustomerPO, Payment,
      Job, ProcessRoute/RouteStage, StageUpdate, Material/StockLevel,
      PurchaseRequest, Vendor/VendorPO, GoodsReceipt, Dispatch, AuditEvent,
      Approval, ClientConfig, User, MessageDraft). Presented to Kasi for
      review in-session.

## Next (in order)

1. `pnpm install` at root; confirm workspace resolves and `prisma validate`
   passes on the schema. Fix any dependency-version issues.
2. `prisma migrate dev` — first migration.
3. Seed script (`packages/core/prisma/seed.ts`): `ClientConfig` (sample INR
   rates from CUSTOMIZE.md), 3 customers, 2 vendors, materials (MS/SS sheets
   in common thicknesses + tube sections), 4 inquiries spanning different
   lifecycle stages.
4. `packages/shared`: zod schemas for service inputs, enums re-exported from
   Prisma-adjacent types, artifact discriminated union.
5. Core services (with tests) in this order: customer/inquiry CRUD → drawing
   attach/review → feasibility create/complete → quote build (line items +
   GST + totals, versioning) → customer PO record → payment record +
   advance-confirmation gate (must flip Job to `PRODUCTION_ELIGIBLE`) → 2
   reports (open-inquiries pipeline, quotes-expiring-within-N-days).
6. Tool layer: 6 tools wrapping the above + `PreToolUse` hooks + threshold
   logic (₹0 default — everything monetary needs approval).
7. Agent runtime (single agent) + 4 skills (inquiry-intake, feasibility,
   quotation, followups) with carefully written trigger descriptions.
8. Next.js UI: chat pane (streaming), approval inbox, inquiry pipeline list,
   artifact renderers (approval_card, quote_card, feasibility_checklist,
   message_draft, report_view).
9. 6 golden-task evals.

## Known issues

- None yet — pre-install. `@anthropic-ai/claude-agent-sdk` version pinned
  as `^0.1.0` in `packages/tools` and `packages/agent` package.json as a
  placeholder; **confirm actual published package name/version** before
  first `pnpm install` (may need adjusting — check npm registry).
- Next.js/React versions in `apps/web/package.json` are placeholders
  (Next 15 / React 19) — confirm compatibility with Claude Agent SDK
  streaming approach chosen in Layer 3 before locking.
- No DB is provisioned yet in this environment — migrations will need a
  reachable `DATABASE_URL` (Postgres). Confirm how this sandboxed
  environment provides one (local Postgres container? external?) in the
  next session if not already resolved.

## Decisions

Product-shaping decisions confirmed with Kasi (session 1):

- **Quote revisions version, not overwrite.** New `Quote` row per revision
  (`version` int, `supersedesId` self-relation, `status` enum incl.
  `SUPERSEDED`). Rationale: matches audit-first philosophy, standard for
  quoting systems, enables "what did we quote last month" queries.
- **Default approval threshold: ₹0.** All monetary writes (Quote, Payment,
  CustomerPO, VendorPO amounts) require human approval in Phase 1 template
  default, regardless of size. Per-client value tunable via `CUSTOMIZE.md`
  §3. Non-monetary low-risk writes (status/notes-only) may still auto-approve.
- **Lost-reason taxonomy: standard 5.** `PRICE`, `LEAD_TIME`,
  `CAPABILITY_MISMATCH`, `CUSTOMER_CANCELLED`, `NO_RESPONSE`, plus `OTHER`
  with required free-text notes.

Ambiguous (non-product-shaping) decisions made solo and logged here per
harness rule 4:

- **JobCard is not a Prisma model.** It's a read-only view assembled by a
  core service from Job + ProcessRoute + RouteStage + StageUpdate + notes,
  per the spec's own wording ("JobCard view assembled from..."). Avoids a
  second source of truth.
- **Two separate process enums**: `QuoteProcess` (billing categories on a
  quote line item — includes `RAW_MATERIAL`, `TRANSPORT`, `OTHER`) vs.
  `RouteStageType` (physical production stages — includes `FABRICATION`,
  `DISPATCH`, no raw-material/transport line). They overlap but aren't
  identical; spec explicitly calls out "process enum" for line items and
  "stage enum" for route stages separately.
- **JobStatus enum**: `CREATED → AWAITING_ADVANCE → PRODUCTION_ELIGIBLE →
  IN_PRODUCTION → DISPATCHED → CLOSED / CANCELLED`. `PRODUCTION_ELIGIBLE`
  chosen to match the golden-task eval's own language ("job becomes
  production-eligible" after advance confirmed).
- **Added a `User` model** (stub auth: id/name/email/role) even though
  Phase 1 has no real auth, because `Approval.proposedBy/decidedBy` and
  `AuditEvent.actorId` need *something* to reference for a working
  approval-inbox UI; kept minimal (no password/session fields).
- **Added a `MessageDraft` model** (not just an ephemeral artifact) so
  drafts are queryable/auditable and `Dispatch.messageDraftId` has
  something concrete to point at. Artifact layer still renders it as
  `message_draft`; the DB row is the persistence-of-record.
- **Money fields suffixed `Paise`** everywhere (not just "amount") to make
  the paise-integer convention impossible to miss in review.

## How to run everything (fill in as pieces land)

```bash
pnpm install
cp .env.example .env   # set DATABASE_URL — see "Known issues" above
pnpm db:migrate
pnpm db:seed
pnpm dev                # starts apps/web + watches packages
pnpm test                # all vitest suites
```

`.env.example` not yet created — add alongside first migration.

# claude-progress.md

_Last updated: 2026-07-03, session 1 (initializer), continued._

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
      Drawing, DrawingCharge, FeasibilityCheck, Quote/QuoteLineItem,
      CustomerPO, Payment, Job, ProcessRoute/RouteStage, StageUpdate,
      Material/StockLevel, PurchaseRequest, Vendor/VendorPO, GoodsReceipt,
      Dispatch, AuditEvent, Approval, ClientConfig, User, MessageDraft).
      Presented to Kasi for review in-session; refined with a follow-up
      correction (see Decisions).
- [x] `pnpm install` at root confirmed clean; dependency versions checked
      against the live npm registry and pinned to current stable majors
      (see Decisions). `prisma validate`, `prisma format`, and
      `prisma generate` all pass. `pnpm typecheck` passes across all 5
      workspace packages.
- [x] Committed and pushed to `claude/erp-agent-setup-1m2uz9`, which is now
      the repo's default branch (repo was empty before this session — no
      separate base branch exists yet to open a PR against).

## Next (in order)

1. `prisma migrate dev` — first migration. Needs a reachable `DATABASE_URL`
   (see Known issues).
2. Seed script (`packages/core/prisma/seed.ts`): `ClientConfig` (sample INR
   rates from CUSTOMIZE.md), 3 customers, 2 vendors, materials (MS/SS sheets
   in common thicknesses + tube sections), 4 inquiries spanning different
   lifecycle stages.
3. `packages/shared`: zod schemas for service inputs, enums re-exported from
   Prisma-adjacent types, artifact discriminated union.
4. Core services (with tests) in this order: customer/inquiry CRUD → drawing
   attach/review (incl. `source` = customer-supplied vs shop-drawn) →
   drawing-charge create/invoice/mark-paid (independent of feasibility
   outcome) → feasibility create/complete → quote build (line items + GST +
   totals, versioning) → customer PO record → payment record +
   advance-confirmation gate (must flip Job to `PRODUCTION_ELIGIBLE`) → 2
   reports (open-inquiries pipeline, quotes-expiring-within-N-days).
5. Tool layer: 6 tools wrapping the above + `PreToolUse` hooks + threshold
   logic (₹0 default — everything monetary needs approval, incl.
   `DrawingCharge`).
6. Agent runtime (single agent) + 4 skills (inquiry-intake, feasibility,
   quotation, followups) with carefully written trigger descriptions.
   inquiry-intake skill needs to cover the customer-supplied-vs-shop-drawn
   branch explicitly.
7. Next.js UI: chat pane (streaming), approval inbox, inquiry pipeline list,
   artifact renderers (approval_card, quote_card, feasibility_checklist,
   message_draft, report_view).
8. 6 golden-task evals — consider adding a 7th covering the infeasible-but-
   still-charged-for-the-drawing path, since it's a real edge case product
   flow, not just Phase 1 core scope.

## Known issues

- This sandbox's local Postgres (16, provisioned this session — role
  `fab_erp` / db `fab_erp`) does **not** persist across container restarts
  the way a hosted DB would; run `sudo service postgresql start` at the top
  of a fresh session before touching the DB. `packages/core/.env` is a
  symlink to the root `.env` (Prisma resolves `.env` relative to its own
  cwd, not the repo root — see the comment in `.env.example`).
- Production hosting target is **Railway** (see "Deploying to Railway"
  below) — chosen by Kasi mid-session, not evaluated against alternatives.
  Not yet actually deployed there; repo-side config (`railway.json`,
  `$PORT`-aware start script, `prisma migrate deploy` wired into
  `pnpm start`) is done and verified locally (`pnpm run build` +
  `pnpm run start` both succeed against local Postgres), but the Railway
  project itself (GitHub connection, Postgres plugin, env vars, domain)
  requires Kasi's own Railway login — I can't do that from this sandbox.

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
- **CAD drawing charges get a dedicated `DrawingCharge` model, separate from
  Quote/QuoteLineItem/Payment.** Kasi clarified mid-session: many customers
  only bring a requirement, not a drawing — the shop's own engineers draw
  the CAD (`Drawing.source = SHOP_DRAWN` vs `CUSTOMER_SUPPLIED`), and that
  work is billable **regardless of whether the part is later found
  infeasible to manufacture**. Since it must survive independent of any
  production `Quote` existing, it can't live as a `QuoteLineItem`. Amount
  is **not** rate-card-computed — Kasi's call was "owner decides" per job
  (`DrawingCharge.amountPaise` + `decidedBy`, set manually), unlike every
  other billable process which pulls from `ClientConfig.processRates`. See
  `CUSTOMIZE.md` §4a.

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
- **`DrawingCharge.status` includes `WAIVED`** (not just pending/invoiced/
  paid) — when a job does turn out feasible and proceeds to a full order,
  the owner may choose to waive the standalone drawing fee rather than
  double-bill; that's a per-case human call the schema should allow for,
  not something a service should decide automatically.
- **Dependency versions pinned to current stable majors after checking the
  npm registry** (not left at guessed defaults): Prisma 6.19 (not 7 — v7
  switched to a different ESM-only generator requiring a mandatory
  `output` path that I couldn't verify safely without live docs access),
  `@anthropic-ai/claude-agent-sdk` 0.3.199 (its `package.json` requires
  `zod@^4.0.0`, so zod is pinned to 4.x repo-wide for consistency rather
  than the more commonly-seen 3.x), Next 16.2 / React 19.2, TypeScript 5.9
  (not 6.0 — too recently released to trust broad tooling/plugin support
  yet, e.g. `@typescript-eslint`), Turborepo 2.10, Vitest 4.1.

## How to run everything

### Local dev

```bash
sudo service postgresql start   # this sandbox only — skip on a machine where it's already running
pnpm install                    # also runs `prisma generate` (packages/core postinstall)
cp .env.example .env             # then fill in DATABASE_URL / ANTHROPIC_API_KEY
ln -sf ../../.env packages/core/.env   # Prisma needs .env next to where it's invoked from
pnpm db:migrate                  # first time / after schema changes — creates a shadow DB
pnpm db:seed                     # not written yet (task: "Prisma migrations + seed data")
pnpm dev                          # starts apps/web + watches packages, http://localhost:3000
pnpm test                         # all vitest suites (none exist yet)
```

### Deploying to Railway

One-time setup, done in the Railway dashboard (needs Kasi's Railway
account — not something I can do from this sandbox):

1. New Project → Deploy from GitHub repo → pick this repo.
2. Leave **Root Directory** as `/` (repo root) — pnpm workspaces need the
   full monorepo, not just `apps/web`. `railway.json` at the repo root
   already tells Railway the build/start commands; no manual override
   needed unless you want to change them.
3. Add a **Postgres** plugin to the project (Railway's own template, not a
   manually-entered connection string).
4. On the web service → Variables: add a **reference** to the Postgres
   plugin's `DATABASE_URL` (not a copy-pasted value — a reference stays in
   sync if Railway ever rotates it). Add `ANTHROPIC_API_KEY` by hand.
5. Generate a public domain under Settings → Networking, once you want the
   app reachable outside Railway's internal network.

After that, every push to this branch triggers: `pnpm install` (+ Prisma
client generation) → `pnpm run build` (turbo build across all packages) →
`pnpm run start` (`prisma migrate deploy` against the live DB, then
`next start -p $PORT`). No manual migration step on deploy.

`pnpm run build` and `pnpm run start` were both run locally this session
against the sandbox's Postgres to confirm the exact commands Railway will
run actually work end to end before wiring up the dashboard side.

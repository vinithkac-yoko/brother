# claude-progress.md

_Last updated: 2026-07-03, session 1 (initializer), continued._

Read this file first every session. Update it at the end of every session
and after every milestone, per harness rules.

## Current phase

**Phase 1 — Front office: Lead → Quote → PO → Advance.** All 6 layers now
exist end to end (schema → services → tools → agent → UI). Demo-ready for
the pipeline/approvals views right now; the live agent chat needs a real
`ANTHROPIC_API_KEY` to actually run (see Known issues) — not yet supplied.

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
- [x] Made the app Railway-deployable: `railway.json`, `$PORT`-aware start
      script, `prisma migrate deploy` wired into `pnpm start`, `postinstall`
      Prisma-generate hook. Verified `pnpm run build` + `pnpm run start`
      both succeed end-to-end locally. Actual Railway project setup
      (GitHub connection, Postgres plugin, env vars) still needs Kasi's own
      Railway login — not done yet.
- [x] **Layer 5** (`packages/shared`): enums mirroring every Prisma enum,
      an `Actor` type (USER/AGENT), one zod input schema per service
      capability, and the fixed 6-type `Artifact` discriminated union.
      7 passing vitest tests.
- [x] **Layer 1** (`packages/core`): full service layer — customer/contact,
      inquiry (incl. lost-reason), drawing (incl. source), DrawingCharge
      (create/invoice/mark-paid/waive), feasibility (create/complete),
      quote (build/revise with real versioning), customerPO (spins up the
      Job spine + requires a Drawing to exist first), payment (record +
      the advance-confirmation production gate), and the 2 Phase 1 reports.
      Every service: zod validate → `requireRole` permission check →
      transaction → `AuditEvent` write. 44 passing integration tests
      against a real Postgres test DB (`fab_erp_test`, truncate-between-
      tests, not mocked) — includes a dedicated test proving
      `confirmPayment` is the *only* thing that flips `Job.status` to
      `PRODUCTION_ELIGIBLE`, only for ADVANCE payments, only once, only
      for ADMIN actors.
- [x] Seed script (`packages/core/prisma/seed.ts`) run against the dev DB:
      ClientConfig, 2 vendors, 7 materials, 3 customers, and 4 inquiries
      at NEW / FEASIBILITY / QUOTED / WON+PRODUCTION_ELIGIBLE — built
      through the real services (not raw `prisma.create`), so seed data
      carries a real 26-row AuditEvent trail. Re-runnable any time the dev
      DB is reset.
- [x] `Approval.executedAt` + `executionResult` added (small follow-up
      migration) — `execute_approved` now refuses to double-run the same
      Approval, a real correctness gap that wasn't caught until building
      the tool layer.
- [x] **Layer 2** (`packages/tools`): all 6 tools (`search_records`,
      `get_record`, `run_report`, `propose_transaction`, `execute_approved`,
      `draft_message`) as one in-process `createSdkMcpServer`. An action
      registry (`actions.ts`) maps 18 named actions to core services, each
      tagged `monetary: boolean` — monetary ones stay `PENDING` until a
      human approves, non-monetary ones auto-approve but still require an
      explicit `execute_approved` call. `PreToolUse` hook duplicates the
      "Approval must be APPROVED and unexecuted" check one layer before
      the tool body runs, per CLAUDE.md's defense-in-depth requirement.
      `execute_approved` reshapes a few result types (Quote → `quote_card`,
      FeasibilityCheck → `feasibility_checklist`, a job-bearing Payment
      result → `job_card`) into the fixed artifact union; everything else
      falls back to labeled raw JSON. 8 passing integration tests.
- [x] **Layer 4** (`skills/`): real content written for all 4 Phase 1
      skills (inquiry-intake, feasibility, quotation, followups) — no
      longer stubs.
- [x] **Layer 3** (`packages/agent`): thin system prompt
      (`systemPrompt.ts`) with the 4 skills' procedural knowledge condensed
      inline (see Known issues — true Skill-tool loading is deferred), and
      `session.ts` wrapping `query()` with `permissionMode: 'dontAsk'`,
      `tools: []` (all built-ins off, only the 6 ERP tools available), the
      `PreToolUse` hook wired in, and `mcpServers: { erp: ... }`.
      `runAgentTurn()` runs one turn to completion (not token-streamed —
      see Known issues) and returns assembled text + tool calls +
      artifacts.
- [x] **apps/web**: three pages. `/` is a chat UI (`ChatPanel` +
      `ArtifactCard` renderers for all 6 artifact types) calling
      `POST /api/chat` (Node runtime — the SDK spawns a subprocess, can't
      run on Edge). `/approvals` is a server-rendered inbox reading
      `Approval` directly + two server actions (`approveAction`/
      `rejectAction` → new core service `decideApproval`) — per CLAUDE.md,
      this is the one write that legitimately bypasses the agent, since
      it's the human-in-the-loop step itself. `/pipeline` reads the 2
      reports + `Job` directly via core services (no agent needed) —
      confirmed rendering real seeded data (INQ-0001..0003, JOB-0001
      PRODUCTION_ELIGIBLE) end-to-end with **zero API key required**.
- [x] Fixed a real bundler bug hit while verifying the above: every
      internal relative import across `packages/{shared,core,tools,agent}`
      used an explicit `.js` extension (correct for `tsc`'s "Bundler"
      module resolution, which vitest/tsx also honor) — but Next's
      Turbopack dev/build resolver does NOT do that `.js`→`.ts` mapping;
      it's TypeScript-only, not a real bundler feature. All 4 packages'
      typechecks stayed green throughout because `tsc` never saw the
      problem — only `next dev` did, at runtime. Fixed by dropping the
      `.js` suffix from every internal relative import (all 4 packages
      resolve extensionless `.ts` imports fine: tsc Bundler mode, vitest,
      tsx, and Next's bundler all agree on that). All 59 tests + full
      typecheck reconfirmed green after the change.

## Next (in order)

1. **Get a real `ANTHROPIC_API_KEY` into `.env`** — this is the one thing
   blocking the live chat demo from actually running (everything else
   works without it). See Known issues.
2. Properly wire true Agent Skills loading (the `Skill` tool +
   `skills` SDK option) instead of the condensed-into-system-prompt
   simplification currently in place — needs verifying the SDK's project
   skill-discovery path and reconciling it with `tools: []`.
3. 6 golden-task evals — consider adding a 7th covering the infeasible-but-
   still-charged-for-the-drawing path, since it's a real edge case product
   flow, not just Phase 1 core scope.
4. Chat UX: currently one non-streamed response per turn (see Known
   issues) — token-level streaming would read better for a real demo but
   wasn't worth the extra risk under this session's time pressure.
5. Multi-turn conversation isn't wired up yet — `runAgentTurn` takes a
   `conversationId` and passes it through to Approval/AuditEvent records,
   but each call to `query()` starts a fresh session; it doesn't resume
   the SDK's own conversation state across turns yet, so the agent has no
   memory of what it said earlier in the same browser session.
6. Actual Railway deployment (see "Deploying to Railway" below) — still
   needs Kasi's own dashboard setup.

## Known issues

- **The live agent chat cannot run yet — `ANTHROPIC_API_KEY` in `.env` is
  empty.** `/` (chat), `/pipeline`, and `/approvals` all build and serve
  correctly; `/pipeline` and `/approvals` work fully right now (confirmed
  rendering real seeded data with zero API key needed). `/` will error on
  every message until a real key is set — the Agent SDK spawns a `claude`
  subprocess that needs it. This is the single blocker for a full
  end-to-end chat demo.
- **Known architecture simplification**: true Agent Skills loading (the
  SDK's `skills` option + `Skill` tool + progressive disclosure from
  `skills/*/SKILL.md`) is NOT wired up, despite `skills/` having real
  content now. Two reasons, both time-boxed decisions: (1) verifying the
  SDK's exact skill-discovery path (project `skills/` vs `.claude/skills/`,
  etc.) needed more time than was available before this demo; (2) it
  conflicts with `tools: []` (disabling all built-in tools, including
  `Skill`, to keep the agent scoped to only the 6 ERP tools). Current
  workaround: `packages/agent/src/systemPrompt.ts` inlines a condensed
  version of all 4 skills' procedural knowledge directly. This deviates
  from the CLAUDE.md Layer 4 design ("thin system prompt; procedural
  knowledge lives in skills") and should be revisited — the skill content
  itself is real and complete, only the *loading mechanism* is a stand-in.
- **Chat is not token-streamed.** `runAgentTurn` collects the whole
  turn (text + tool calls + artifacts) and the API route returns it as one
  JSON response, rather than streaming deltas to the browser. Simpler and
  more robust to get right under time pressure; the tradeoff is the UI
  shows "Agent is working…" rather than live token output.
- **`execute_approved` idempotency guard is new and only lightly tested.**
  `Approval.executedAt` prevents a double-click from re-running a write,
  covered by one test — but this is exactly the kind of thing worth a
  second look once there's more time (e.g. concurrent execute_approved
  calls racing on the same Approval before the first `executedAt` write
  lands — the current implementation is not wrapped in a single atomic
  check-and-set transaction).

- This sandbox's local Postgres (16, provisioned this session — role
  `fab_erp` / db `fab_erp`) does **not** persist across container restarts
  the way a hosted DB would; run `sudo service postgresql start` at the top
  of a fresh session before touching the DB. `packages/core/.env` is a
  symlink to the root `.env` (Prisma resolves `.env` relative to its own
  cwd, not the repo root — see the comment in `.env.example`). Same story
  for a second DB, `fab_erp_test` (role `fab_erp` also owns it), used by
  `pnpm --filter @fab-erp/core test` — see `packages/core/.env.test`.
  `apps/web/.env` is also a symlink to the root `.env`, for the same
  reason — Next.js only auto-loads `.env` files from the app directory,
  not the monorepo root.
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

- **Every `...Input`/`...Params` type alias in `packages/shared` uses
  `z.input<typeof schema>`, not `z.infer`/`z.output`.** Any schema with a
  `.default()` (e.g. `Drawing.source`, `isPrimary`, `missingInfo`) has an
  output type where that field is required — fine for what `schema.parse()`
  *returns*, wrong for what a caller should have to *supply*. Service
  function parameters are typed with the input variant so callers can
  still omit fields with sane defaults; the internal `schema.parse(input)`
  call still produces the fully-defaulted output object. `FeasibilityChecklist`
  is the one exception (`z.infer`) since it describes a stored/output shape,
  not something a caller constructs.
- **DrawingCharge stays entirely decoupled from Approval in the service
  layer.** `packages/core` services have no notion of `Approval` at all —
  they just perform the write when called. The propose/approve/execute
  gate is entirely a `packages/tools` (Layer 2) concern, next up. This
  keeps core services simple and directly testable (see the 44 integration
  tests) without needing to fake an approval workflow in every test.
- **Integration tests hit a real Postgres test DB (`fab_erp_test`), not
  mocks.** These services are thin transaction wrappers around real
  queries — a mocked Prisma client would mostly just re-assert the mock.
  Tests truncate all tables in `beforeEach` and run with
  `fileParallelism: false` (shared DB state can't parallelize safely).
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
- **Which actions are `monetary: true` in the tool-layer action registry**
  (`packages/tools/src/actions.ts`) was a judgment call, since CLAUDE.md's
  "₹0 threshold" only says money-touching writes need approval, not which
  of the 18 registered actions count. Money-touching (PENDING, needs
  approval): `create_drawing_charge`, `invoice_drawing_charge`,
  `mark_drawing_charge_paid`, `build_quote`, `revise_quote`,
  `record_customer_po`, `record_payment`, `confirm_payment`. Everything
  else (customer/inquiry/drawing/feasibility writes, plus
  `waive_drawing_charge` — waiving removes a charge rather than creating
  one) auto-approves. `mark_inquiry_lost` is non-monetary despite being a
  real business outcome (losing a deal) — arguable either way; kept simple
  per the literal "monetary" wording rather than expanding to
  "significant" writes generally.
- **`execute_approved` result-shaping is intentionally partial, not
  exhaustive.** Only `Quote` → `quote_card`, `FeasibilityCheck` →
  `feasibility_checklist`, and a job-bearing `Payment` result → `job_card`
  are reshaped into proper artifacts (`packages/tools/src/tools.ts`,
  `shapeArtifact`) — chosen because they're the three that matter for the
  demo's golden path (quote a job, check feasibility, confirm an advance).
  Customer/Inquiry/Drawing/CustomerPO/DrawingCharge results fall back to
  labeled raw JSON in the UI. Worth extending once there's time, not
  required for Phase 1 correctness (the underlying writes are correct
  either way — this only affects how nicely the UI renders the result).

## How to run everything

### Local dev

```bash
sudo service postgresql start   # this sandbox only — skip on a machine where it's already running
pnpm install                    # also runs `prisma generate` (packages/core postinstall)
cp .env.example .env             # then fill in DATABASE_URL / ANTHROPIC_API_KEY (chat needs the real key)
ln -sf ../../.env packages/core/.env   # Prisma needs .env next to where it's invoked from
ln -sf ../../.env apps/web/.env         # Next.js only auto-loads .env from its own app dir
pnpm db:migrate                  # first time / after schema changes — creates a shadow DB
pnpm db:seed                     # ClientConfig + 2 vendors + 7 materials + 3 customers + 4 inquiries
pnpm dev                          # starts apps/web + watches packages, http://localhost:3000
# / = chat (needs ANTHROPIC_API_KEY) · /pipeline = read-only report views · /approvals = approval inbox

# Tests (real Postgres, not mocked, across core + tools):
createdb -O fab_erp fab_erp_test   # one-time, plus GRANT — see packages/core/.env.test for the URL
cp packages/core/.env.test packages/tools/.env.test   # same test DB, both packages need their own copy
pnpm --filter @fab-erp/core test    # pretest applies migrations, then 44 integration tests run
pnpm --filter @fab-erp/tools test   # 8 more (propose_transaction/execute_approved/hook)
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

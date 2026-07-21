# Engineering Journal

A chronological log of decisions, assumptions, tradeoffs, blockers, and observations during the build. The timeline below uses **relative elapsed time** (T+0 = the first scaffold commit) and reports **durations, not clock times** — what matters is how long each thing took, and how the original prototype connects to the later enhancements. This records *what happened and the evidence*, not a self-assessment of quality.

## Timeline (relative; durations, not clock times)

`Duration` is how long the step took; `Cumulative` is total elapsed since T+0. Durations are approximate (±); sub-minute steps are noted where measured.

### Phase 1 — Prototype (initial session)

| Duration | Cumulative | Activity |
| --- | --- | --- |
| ~11m | 0:11 | Scaffold (npm workspaces — chosen after `pnpm`/global install hit `EACCES`, no sudo) + foundation built serially: `packages/shared` (types/RBAC/validation), `apps/server` (Express+SQLite+seed+audit+RBAC middleware), `apps/web` platform primitives + tool-definition engine, then all three workflows (KYC, Refunds, Feature Flags) + the Audit viewer. |
| ~1m | 0:12 | **45-minute checkpoint, reached early.** Adversarial `curl` confirms server-enforced RBAC, append-only audit, and refund/KYC/flag validation end-to-end. Decision: keep the architecture, continue. |
| ~2m | 0:14 | Browser check: role-gating renders (Viewer actions `disabled` with a "Requires \<permission\>" tooltip). |
| ~80s | 0:16 | **Fourth-tool experiment** (Support Tickets) — see metrics below. |
| ~2m | 0:18 | Automated adversarial suite (8 tests, all six required scenarios) green. |
| ~2m | 0:20 | ESLint added (typescript-eslint, `no-explicit-any`, react-hooks); fixed 2 errors/3 warnings; full gate green (lint/typecheck/test/build). |
| ~5m | 0:25 | Docs: README, this journal, build-vs-buy report. |
| ~12m | 0:37 | After the user created the repo: pushed, opened PR #1, applied 3 Devin Review fixes (ISO seed dates ×2, CORS restriction), environment blueprint. |
| ~38m | 1:15 | End-to-end UI testing + annotated screen recording (Viewer/Operator/Admin, golden + adversarial paths); test report; PR evidence comment. |

**Phase 1 subtotal ≈ 1h15m.** Note: hands-on *construction* of the working platform + all workflows was only ~20–25m (T+0 → docs); the rest of Phase 1 is PR/review/testing/recording. This is the "build is cheap, everything around it isn't" pattern the report analyzes.

### Phase 2 — Post-review enhancements (continuation session)

Added after the initial time box, in response to "what is the remaining budget best spent on?" — chosen for evidence value to a VP, not polish.

| Duration | Cumulative | Activity |
| --- | --- | --- |
| ~10m | 1:25 | Reworked the build-vs-buy estimate: split **build effort vs calendar-to-production**, added the org-availability (instant reviews/approvals) compression analysis and its hard floors. |
| ~45m | 2:10 | **Connector abstraction**: `Connector` interface + `SqliteConnector` + `RestConnector` (central auth-header injection, timeout, uniform error mapping); added the live **FX Rates** tool (reads a real external REST API) + 2 deterministic connector unit tests. |
| ~30m | 2:40 | **Deployable artifact + CI**: single-image `SERVE_WEB` mode, Dockerfile/`docker compose` (image built and container verified serving web + API + live connector on one port), GitHub Actions running the full gate on every push/PR. |
| ~15m | 2:55 | **Validation pass**: 40 scripted API checks (full RBAC matrix, refund/flag/KYC edge cases, audit integrity, CORS) — 40/40 passed. |
| ~10m | 3:05 | Docs updates (README, report, this journal) + commit/push; CI green on the PR. |

**Phase 2 subtotal ≈ 1h05m. Cumulative total ≈ 3h05m** (within the exercise's 3–4h guideline).

## Architectural decisions

1. **Judge the platform, not three pages.** The evaluation question is whether the *reusable* capabilities behind Retool can be reproduced. So the central artifact is a declarative **tool-definition** engine (`toolDefinition.ts` + `ToolPage.tsx`): a tool is `{ columns, filters, actions, fetch, submit }` and the engine provides search/filter, table, permission-gated actions, schema forms, confirm flows, loading/error/empty, toasts, and refetch. This is where the "next tool is cheap" claim is made concrete.
2. **One RBAC model, enforced server-side.** `packages/shared/src/rbac.ts` is the single role→permission matrix. The client uses it to disable/hide actions (UX); the server uses it to *enforce* and to write a `denied` audit event. The client cannot bypass it — flipping the role header on a Viewer still yields `403` on writes (proven in tests).
3. **One audit pipeline.** A single `recordAudit` writer is the only path that inserts audit rows, so coverage is uniform. Every mutating endpoint records exactly one event — `success`, `denied`, or `error` — which is what makes "failed actions never look successful" a testable invariant.
4. **Production safeguard modeled as a distinct permission.** `flag.write.production` is separate from `flag.write`; only Admin holds it, and the UI additionally forces a confirmation step for production. This mirrors how real internal tools gate consequential actions.
5. **Contracts frozen before breadth.** Types, the API surface, RBAC, validation, and the tool-definition shape were written first so that additional tools (and, in principle, parallel sessions) plug into fixed interfaces.

## Fourth-tool marginal-cost experiment (Support Tickets)

Goal: measure the real cost of adding tool #4 on the shared platform.

| Metric | Result |
| --- | --- |
| Elapsed (first edit → `typecheck` green) | **~78 seconds** of coding (23:43:13 → 23:44:31); ~3–4 min including reseed + `curl` verification |
| Files created | **2** — `apps/server/src/routes/tickets.ts` (76 LOC), `apps/web/src/tools/tickets.tsx` (53 LOC) |
| Files edited | **5**, all tiny — `shared/types.ts` (+SupportTicket already existed; +2 permission strings), `shared/rbac.ts` (+4 lines), `server/app.ts` (+2), `server/seed.ts` (+~12 seed rows), `web/tools/registry.tsx` (+1 nav entry) |
| Approx. workflow-specific LOC | **~130** new + ~20 edited |
| New platform primitives required | **None.** Reused `ToolPage`, `DataTable`, `ActionForm`, `SearchFilterBar`, RBAC middleware, `recordAudit`, and the typed API client. |
| Config vs custom logic | **~85% configuration / boilerplate, ~15% workflow-specific.** The only genuinely tool-specific logic is one `onSubmit` line (client) and a ~5-line status validation (server). |

Interpretation: on this platform, a new CRUD-style internal tool with search, filtering, a gated write action, validation, and full audit is roughly one server route + one declarative UI file. The dominant remaining cost is deciding the columns/filters/actions and the server's domain validation — not rebuilding tables, forms, auth, or audit.

## Parallelization: evaluated and deliberately declined (for this build)

The plan approved spawning child Devin sessions for independent verticals. After building the platform, the measured marginal cost of a tool (~80s of coding, ~130 LOC, no new primitives) made child-session coordination overhead (push repo → clone → `npm install` → build a branch → open PR → review → merge → resolve integration) clearly larger than the work itself for a 2-hour build. I therefore built all workflows serially and documented this as a finding.

**When parallelization *would* pay off here:** (a) large, genuinely independent surfaces (e.g. a brand-new charting/analytics primitive vs. the CRUD engine); (b) a cold-start batch — e.g. building 15 tools at once, where N sessions each own a vertical; (c) multiple human engineers working concurrently who need isolated branches. The prerequisite in all cases is exactly what was done first: freeze the shared contracts (types, API, RBAC, tool-definition shape) before fanning out.

## Blockers encountered

- **`pnpm` global install failed** (`EACCES`, no sudo). Cause: locked-down `/usr/lib`. Resolution: switched to npm workspaces — no functional difference for this prototype.
- **GitHub repo creation blocked.** The Devin GitHub app token cannot create repositories under the user account (`Resource not accessible by integration`). Resolution: asked the user to create an empty private repo; local work continued in parallel.
- **`tsc -b` vs. non-composite projects.** Initial root `typecheck` used project references incorrectly. Resolution: each workspace runs `tsc --noEmit -p tsconfig.json`.
- **SQLite boolean typing.** `better-sqlite3` returns integers for booleans; `FeatureFlag.enabled` is `boolean`. Fixed with a local `FlagRow` row type and normalization at the API boundary.

## Shortcuts taken for the prototype (and what production would require)

| Shortcut | Production requirement |
| --- | --- |
| Mock auth via `x-role` header + dev role selector | Real IdP (SSO/OIDC/SAML), sessions, SCIM provisioning, CSRF protection |
| SQLite file, seeded mock data | Managed Postgres, migrations, connection pooling, real data-source connectors (Stripe, KYC vendor, flag store) |
| Coarse role→permission matrix | Fine-grained/attribute-based access, per-record scoping, approval workflows (maker-checker) |
| Audit rows in the same SQLite table | Tamper-evident/append-only store (e.g. WORM storage or hash-chained log), retention policy, export to SIEM |
| No rate limiting / input hardening beyond validation | Rate limits, request-size limits, schema validation at the edge, secrets management |
| No deploy/monitoring/CI | Containerized deploy in VPC, TLS, CI/CD, health checks, metrics, alerting, on-call |

## Capabilities attempted but not completed / intentionally omitted

- **Intentionally omitted:** visual drag-and-drop builder, non-engineer authoring UX, real connectors, workflows/cron automations, multi-tenant, mobile, SSO/SCIM, deployment infra. These are Retool surface area that a prototype cannot and should not reproduce in the time box; they are analyzed as gaps in the report.
- **Attempted-but-scoped-thin:** the three workflows are deliberately kept thin (one primary write action each) rather than exhaustive, per the "keep workflows thin over polishing one" guidance.

## Where Devin accelerated development vs. where human effort was still required

- **Greatest acceleration:** generating the repetitive-but-exacting layers — the tool-definition engine, the reusable table/form/filter components, the typed API client, the seed data, and especially the *fourth tool* (near-instant once the pattern existed). Also the adversarial test suite, written directly from the required scenarios.
- **Still required human/engineering judgment:** the *architecture decision* to invest in a declarative engine instead of three pages (this is the crux of the evaluation and would not emerge from "build these three screens"); the RBAC model design (separating `flag.write.production`); deciding what to make a shared primitive vs. per-tool config; and the honest call to *not* parallelize. These are design/tradeoff decisions, not code volume.

## Post-review enhancements (after the 2-hour prototype)

These were added *after* the initial 2-hour box, in response to the evaluator's question of what the remaining time is best spent on. The goal was to strengthen the *evaluation evidence* — specifically to attack the parts of Retool that actually cost money — rather than to polish the UI. Each was chosen for signal-per-hour to a VP audience.

- **Connector abstraction + live data source (~45 min).** Introduced a single `Connector` interface (`apps/server/src/connectors/`) with two implementations: `SqliteConnector` (local DB) and `RestConnector` (external HTTP APIs — central auth-header injection, `AbortController` timeout, and `ConnectorError` mapping so upstream failures become a uniform 502 envelope). Added a fifth tool, **FX Rates**, that reads *live* rates from a public REST API through `RestConnector`, on the same declarative `ToolPage` engine. This directly answers the biggest objection to any prototype ("it's all mocked") and is the miniature of Retool's core "managed connectors" value. No new UI primitives were required — the tool is ~30 lines of config plus a route. Two connector unit tests use an injected `fetch` so they stay deterministic (no network in CI).
- **Deployable artifact + CI (~30 min).** Added a single-image mode (`SERVE_WEB=1` makes the API serve the built web from the same origin), a `Dockerfile`/`docker-compose.yml` (verified: image builds and the container serves web + API + live connector on one port), and a GitHub Actions workflow running lint/typecheck/test/build on every push/PR. This grounds the "can we actually own, run, and maintain this?" question with real artifacts instead of assertions.
- **Comprehensive validation pass (40 API checks).** Beyond the 8 automated adversarial tests, ran a scripted harness over the running API covering the full RBAC matrix (reads for every role; every mutation denied for Viewer), the production-flag safeguard, `rates.read` for all roles, refund edge cases (settled-only, non-existent txn, zero/negative/over-limit amounts, partial-then-remaining, double refund), rollout-percentage bounds, KYC note rules (empty/whitespace/invalid decision/reject/escalate), audit integrity (denied/error never recorded as success), and CORS (allow-origin header present for the configured origin, absent for a disallowed one). Result: **40/40 passed.**

**Estimate correction surfaced during this work.** The initial report conflated *build effort* with *time-to-production*. These enhancements reinforced the corrected framing now in `BUILD_VS_BUY.md` §3/§8: Devin makes the *construction* fast (the connector seam, live tool, container, and CI took well under two hours combined), but the residual 3–6 month calendar to production is dominated by security/compliance review, external-vendor/IdP integration, and elapsed-time gates — none of which this kind of fast construction removes. A fully-committed org (instant reviews/approvals) plus parallel subagents can compress the calendar toward weeks, but external-party, elapsed-time, and sequential floors keep it above "days."

**Intentionally still omitted (and why).** Full connector *catalog*, real SSO/SAML/SCIM, Retool Workflows/cron, the visual drag-and-drop builder, and managed monitoring/SLAs/SOC 2 were deliberately left as documented gaps. Building them would exceed the plausible-POC time budget and, more importantly, they are ownership/operations/product-surface work whose cost is *maintenance and governance*, not initial construction — which is precisely the build-vs-buy point.

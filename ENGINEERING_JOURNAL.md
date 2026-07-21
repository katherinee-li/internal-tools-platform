# Engineering Journal

A chronological log of decisions, assumptions, tradeoffs, blockers, and observations during the build. Times are UTC on 2026-07-20. This records *what happened and the evidence*, not a self-assessment of quality.

## Timeline

| Time (UTC) | Activity |
| --- | --- |
| 23:29 | Repo scaffolded (npm workspaces). Chose npm workspaces after `pnpm`/global install failed with `EACCES` (no sudo) — a workaround, not a preference. |
| 23:29–23:40 | Foundation built serially: `packages/shared` (types + RBAC + validation contracts), `apps/server` (Express + SQLite + seed + audit + RBAC middleware), `apps/web` platform primitives + tool-definition engine, and the Feature Flags reference tool. Then KYC, Refunds, and the Audit viewer as tool-definitions. |
| ~23:40 | **45-minute checkpoint** (reached early). Verified via adversarial `curl`: server-enforced RBAC, append-only audit, refund/KYC/flag validation all working end-to-end. Decision: no need to simplify architecture; continue as planned. |
| ~23:42 | Verified the web UI in a browser; confirmed role-gating renders (Viewer's action buttons are `disabled` with a "Requires \<permission\>" tooltip). |
| 23:43:13–23:44:31 | **Fourth-tool experiment** (Support Tickets). See metrics below. |
| ~23:47 | Automated test suite (vitest + supertest): 8 tests incl. all six required adversarial scenarios. All pass. |
| ~23:49 | Added ESLint (typescript-eslint, `no-explicit-any`, react-hooks). Fixed 2 errors + 3 warnings. Full gate green: lint + typecheck + test + build. |
| ~23:52 | Documentation (README, this journal, build-vs-buy report). |

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

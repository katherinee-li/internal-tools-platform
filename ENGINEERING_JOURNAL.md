# Engineering Journal

A concise record of what was built, how long each part took, and what was deliberately left out.
The timeline uses **relative elapsed time** (T+0 = first commit) and reports **durations** — how
long each step took, not clock times. It excludes idle time between sessions.

## Timeline

| Duration | Cumulative | Activity |
| --- | --- | --- |
| ~15m | 0:15 | Scaffold (npm workspaces) + shared contracts (types, RBAC, validation), Express + SQLite server with audit + RBAC middleware, and the web platform engine (tool-definition + reusable table/form/filter primitives). |
| ~10m | 0:25 | The three core workflows — KYC Review, Refunds, Feature Flags — plus the Audit Log viewer, all on the shared engine. |
| ~1m | 0:26 | Marginal-cost experiment: added a structurally similar CRUD tool on the existing engine in ~80 seconds, 0 new primitives. |
| ~15m | 0:41 | Non-CRUD **Operations Analytics** dashboard: a reusable chart/aggregation primitive + an aggregation endpoint. |
| ~10m | 0:51 | Automated test suite (vitest + supertest) + an adversarial API validation pass. |
| ~14m | 1:05 | Lint/typecheck/build gate, single-image Docker, and GitHub Actions CI. |
| ~15m | 1:20 | Documentation (README, evaluation). |
| ~25m | 1:45 | PR, review fixes, and end-to-end UI testing with a screen recording. |

**Total ≈ 1h45m of active work.** Hands-on construction of the working software was only ~25–30m;
the rest is tests, CI, PR/review, UI testing, and docs — the "building is cheap, everything around
it isn't" pattern the evaluation analyzes.

## Architecture at a glance

1. **A platform, not three pages.** A tool is a declarative definition
   (`{ columns, filters, actions, fetch, submit }`); one engine (`toolDefinition.ts` + `ToolPage.tsx`)
   provides search/filter, tables, permission-gated actions, schema forms, confirm flows,
   loading/error/empty states, toasts, and refetch. Non-CRUD tools use a parallel
   `DashboardDefinition` + chart primitive. This is what makes each new tool cheap.
2. **One RBAC model, enforced server-side.** `packages/shared/src/rbac.ts` is the single
   role→permission matrix. The client uses it to disable actions (UX); the server enforces it and
   writes a `denied` audit event. Flipping the role header still yields `403` on writes.
3. **One audit pipeline.** A single `recordAudit` writer inserts every audit row, so each mutating
   endpoint records exactly one `success` / `denied` / `error` event — making "failed actions never
   look successful" a testable invariant.
4. **Consequential actions gated.** `flag.write.production` is a distinct Admin-only permission and
   the UI forces a confirmation step, mirroring how real internal tools gate risky actions.

## Marginal cost of a new tool

- **CRUD tool:** measured by adding a structurally similar table tool — ~80 seconds, ~130 LOC,
  **0 new primitives** — one server route + one declarative UI file, reusing the
  table/form/filter/RBAC/audit layers.
- **Non-CRUD tool (Analytics dashboard):** ~15 minutes, **1 new reusable primitive**
  (chart/aggregation) + ~120 LOC of config and an aggregation query, reusable thereafter.

Reported as both numbers so the flattering case (~80s) isn't mistaken for the whole story: a new
*type* of tool costs one primitive, then is config again.

## Shortcuts taken (and what production requires)

| Prototype | Production requirement |
| --- | --- |
| Mock auth via `x-role` header + dev role selector | Real IdP (SSO/OIDC/SAML), sessions, SCIM, CSRF |
| SQLite file, seeded mock data | Managed Postgres, migrations, real data-source connectors |
| Coarse role→permission matrix | Fine-grained/per-record access, approval workflows |
| Audit rows in SQLite | Tamper-evident store, retention policy, SIEM export |
| No deploy/monitoring beyond the Docker artifact | VPC deploy, TLS, health checks, metrics, alerting, on-call |

## Intentionally omitted

The visual drag-and-drop builder, non-engineer authoring, a managed connector catalog, real
SSO/SCIM, workflows/cron automation, monitoring/SLAs, and SOC 2. These are Retool's surface area
whose cost is ongoing maintenance and governance rather than initial construction — which is exactly
the build-vs-buy point, so they are analyzed as gaps rather than reproduced.

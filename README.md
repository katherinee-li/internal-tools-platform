# Internal Tools Platform (Retool build-vs-buy prototype)

A lightweight, reusable internal-tools platform that demonstrates whether an in-house platform (built with Devin) can reproduce the **reusable capabilities** behind a company's Retool usage — not just three one-off pages.

Three internal apps (KYC Review, Refunds, Feature Flags) plus a fourth tool (Support Tickets) and an Audit Log are all built on a single shared platform: one data layer, one RBAC model, one audit pipeline, and a declarative **tool-definition** engine. Adding a new tool is mostly configuration.

> This is an evaluation prototype. It optimizes for reusable architecture, maintainability, and clear evidence — **not** visual polish or production hardening. See [`BUILD_VS_BUY.md`](./BUILD_VS_BUY.md) for the recommendation and [`ENGINEERING_JOURNAL.md`](./ENGINEERING_JOURNAL.md) for the process log.

## What's inside

| Workflow | Capabilities |
| --- | --- |
| **KYC Review Queue** | Search/filter by name, status, risk; review actions (approve / reject / escalate); mandatory reviewer note; audit logging |
| **Refund Dashboard** | Transaction search; issue refund with validation (settled-only, ≤ refundable, positive); refund reasons; confirmation flow; audit logging |
| **Feature Flag Admin** | View/modify flags per environment; enable + rollout %; environment selector; **production safeguard** (Admin-only + explicit confirm); role restrictions; audit logging |
| **Support Tickets** (4th tool) | Added as a marginal-cost experiment to measure how cheap the *next* tool is |
| **FX Rates (live)** | Read-only tool backed by a **live external REST API** through the platform's connector abstraction — proves the platform is not limited to mock/local data |
| **Audit Log** | Read-only view of every mutating action across all tools — including denied and failed attempts |

## Architecture

Full-stack TypeScript monorepo (npm workspaces):

```
packages/shared     Contracts shared by server + web: domain types, RBAC policy, validation
apps/server         Express + SQLite (better-sqlite3). Server-enforced RBAC, append-only audit
apps/web            React + Vite. Reusable platform primitives + tool-definition engine
```

### Reusable platform primitives

- **Data layer** (`apps/web/src/platform/api.ts`) — one typed client; injects the (dev) role header, parses the API error envelope, throws typed errors.
- **Connector abstraction** (`apps/server/src/connectors/`) — a single `Connector` interface with two implementations: `SqliteConnector` (local DB) and `RestConnector` (live external HTTP APIs, with auth header injected centrally, timeouts, and uniform error mapping). A tool is indifferent to whether its rows come from SQL or a third-party service — this is the miniature of Retool's "managed connectors" value. The **FX Rates** tool reads live rates through `RestConnector`.
- **Auth + RBAC** (`packages/shared/src/rbac.ts`, `apps/server/src/auth.ts`) — a single role→permission matrix used on **both** sides: the client hides/disables actions, the server *enforces* them and audits denials.
- **Audit** (`apps/server/src/audit.ts`) — one append-only writer used by every mutating endpoint; success, denied, and error outcomes are all recorded.
- **UI kit** (`apps/web/src/platform/`) — `AppShell` + nav + dev role selector, `DataTable`, schema-driven `ActionForm`/`Modal`, `SearchFilterBar`, badges, toasts, loading/error/empty states.
- **Tool-definition engine** (`toolDefinition.ts` + `ToolPage.tsx`) — renders a full CRUD-style screen (search/filter → table → permission-gated actions → form/confirm → toast/refetch) from a declarative object. **This is what makes the next tool cheap.**

Each app is therefore a small declarative file. A full tool UI is ~50–90 lines of config (see `apps/web/src/tools/*.tsx`).

## Roles (demonstration)

A **development-only role selector** (top-right) switches between:

| Role | Access |
| --- | --- |
| **Viewer** | Read-only across all tools |
| **Operator** | KYC decisions, refunds, ticket updates, non-production flag changes |
| **Admin** | Everything, including **production** feature-flag changes |

RBAC is enforced **server-side** — switching roles in the client cannot bypass it. The selector only changes the `x-role` header; the server is authoritative.

## Setup & run

Requirements: Node 20+.

```bash
npm install          # install workspace deps (builds better-sqlite3)
npm run seed         # create ./apps/server/data.db and load deterministic mock data
npm run dev          # start API (:4000) + web (:5173) together
```

Then open http://localhost:5173 and use the role selector (top-right) to try Viewer / Operator / Admin.

### Run as a single container

```bash
docker compose up --build     # then open http://localhost:4000
```

The Docker image builds the web app and serves it from the API process on one port (`SERVE_WEB=1`), demonstrating the app is deployable as a single artifact. It is a prototype container, not production-hardened (see limitations).

> `npm run dev` writes `data.db` in the repo (gitignored). Re-run `npm run seed` any time to reset to a clean state.

## Quality gates

```bash
npm run lint         # eslint (typescript-eslint, no-explicit-any, react-hooks)
npm run typecheck    # tsc --noEmit across all workspaces
npm test             # vitest + supertest — RBAC + validation + audit + connectors (11 tests)
npm run build        # production web build
```

These run in CI on every push/PR via GitHub Actions (`.github/workflows/ci.yml`).

The test suite (`apps/server/src/platform.test.ts`) covers the negative paths explicitly:
Viewer→refund (denied), Operator→production flag (denied), refund > refundable, double refund, KYC decision with no note, and that **failed/denied actions never produce a `success` audit event**.

## Known limitations (prototype)

Mock auth (dev role selector, not real SSO), mock data (no real Stripe/KYC vendors), SQLite (not production Postgres), no real deployment/monitoring/CI. These are intentional and are analyzed as production gaps in [`BUILD_VS_BUY.md`](./BUILD_VS_BUY.md).

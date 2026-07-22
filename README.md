# Internal Tools Platform (Retool build-vs-buy prototype)

A reusable internal-tools platform, built with Devin, that demonstrates whether an in-house
platform can reproduce the **reusable capabilities** behind a company's Retool usage — not just a
few one-off pages.

Four tools — three core workflows plus a non-CRUD analytics dashboard — run on one shared platform
(one data layer, one role-based permission model, one audit pipeline, reusable UI), so that adding
the next tool is mostly configuration.

> This is an evaluation prototype: it optimizes for reusable architecture and clear evidence, **not**
> production hardening. See [`EVALUATION.md`](./EVALUATION.md) for the scored evaluation and the
> build-vs-buy recommendation, and [`ENGINEERING_JOURNAL.md`](./ENGINEERING_JOURNAL.md) for the
> build log.

## What it does

| Tool | Capabilities |
| --- | --- |
| **KYC Review** | Search/filter by name, status, risk; approve / reject / escalate with a mandatory reviewer note; audit logging |
| **Refunds** | Transaction search; issue refund with validation (settled-only, ≤ refundable, no double refund); reason + confirmation; audit logging |
| **Feature Flags** | View/modify flags per environment; enable + rollout %; **production safeguard** (Admin-only + explicit confirm); audit logging |
| **Operations Analytics** | A non-CRUD dashboard — KPI cards and charts over aggregated queries — showing the platform generalizes past table/form CRUD |
| **Audit Log** | Read-only view of every mutating action across all tools, including denied and failed attempts |

## Architecture

Full-stack TypeScript monorepo (npm workspaces):

```
packages/shared     Contracts shared by server + web: domain types, RBAC policy, validation
apps/server         Express + SQLite. Server-enforced RBAC, append-only audit
apps/web            React + Vite. Reusable platform primitives + tool-definition engine
```

The core idea is a declarative **tool-definition engine**: a tool is an object
(`{ columns, filters, actions, fetch, submit }`) and the engine renders the whole screen —
search/filter, table, permission-gated actions, forms, confirmation, toasts, and loading/error/empty
states. A parallel **dashboard engine** + chart primitive handles non-CRUD tools. RBAC and audit are
single shared layers used by every tool. This is what makes each new tool cheap to add.

## Roles

A development-only role selector (top-right) switches between:

| Role | Access |
| --- | --- |
| **Viewer** | Read-only across all tools |
| **Operator** | KYC decisions, refunds, non-production flag changes |
| **Admin** | Everything, including production feature-flag changes |

RBAC is enforced **server-side** — switching roles in the client cannot bypass it.

## Setup & run

Requirements: Node 20+.

```bash
npm install          # install workspace deps
npm run seed         # create the local DB and load deterministic mock data
npm run dev          # start API (:4000) + web (:5173) together
```

Then open http://localhost:5173 and use the role selector (top-right) to try Viewer / Operator / Admin.

Run as a single container:

```bash
docker compose up --build     # then open http://localhost:4000
```

## Quality gates

```bash
npm run lint
npm run typecheck
npm test              # vitest + supertest — RBAC, validation, audit (9 tests)
npm run build
```

These run in CI on every push/PR via GitHub Actions.

## Known limitations (prototype)

Mock auth (dev role selector, not real SSO), mock data, SQLite rather than production Postgres, and
no real deployment/monitoring. These are intentional and are analyzed as production gaps in
[`EVALUATION.md`](./EVALUATION.md).

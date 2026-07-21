# Evaluation framework & metrics

This scores the prototype against the six-criterion framework. Each metric is tagged
**[measured]** (from this repo / CI / the journal) or **[estimated]** (a modeled figure with
stated assumptions — validate before quoting to a decision-maker). The framework is a fair one;
the two renamings it proposes ("*changes* long-term ownership cost", operational simplicity as
*evidence against*) are adopted here because they are more honest, not less.

> **Confounder to keep in mind for criteria 1–2:** the single largest driver of the results
> below was a *human* architectural decision — to build a declarative tool-definition **engine**
> instead of four hand-written pages. No elapsed-time metric captures that judgment call, and it
> is exactly the kind of decision a team still has to make well for Devin's speed to pay off.

---

## 1. Engineering leverage
*How much faster/cheaper does Devin make building internal tools?*

| Metric | Value | Source |
| --- | --- | --- |
| Total elapsed build time | Working software ~20–25m; cumulative incl. tests/PR/testing/docs/enhancements ≈ **3h05m** | [measured] journal timeline |
| Active human time vs Devin execution | Human ≈ **30–45m** (prompts, decisions, review); remainder is Devin generating/running + automated/UI testing | [estimated] |
| Prompts / interventions | ~**25–35** user turns across the whole engagement (plan approval, feedback, scope decisions) | [estimated] |
| Rework / corrections | **Low**: 3 Devin Review fixes (ISO seed dates ×2, CORS), a handful of lint/type fixes; no architectural rework | [measured] |
| LOC generated | **~2,464** lines TS/TSX (+ docs), large majority Devin-generated | [measured] `wc -l` |
| Tests generated | **11** automated (vitest+supertest) + a **40-check** API validation harness | [measured] |
| Time to build tool #1 vs #4 | Tool #1 (Feature Flags reference) built within the ~11m foundation; **tool #4 ≈ 80s**; tool #5 (live-connector FX) ≈ 30 LOC config + one route | [measured] |
| Devin usage / ACUs & cost | **[estimated — confirm on the usage dashboard]** prototype in the low-hundreds-of-dollars of ACUs; marginal per-tool cost negligible | [estimated] |

**Strongest evidence:** the 4th tool took ~80s and required **no new platform primitives**.

---

## 2. Platform extensibility & standardization
*Reusable infrastructure, or merely four pages?*

| Metric | Value | Source |
| --- | --- | --- |
| % configuration vs custom logic (per new tool) | ~**85% config / 15% custom** (measured on tool #4): a tool is a ~50–90 LOC definition + an optional route | [measured] |
| Reusable substrate vs per-tool code | Substrate ≈ **~1,600 LOC** (shared contracts 258, web platform 693, server infra) reused by every tool; per-tool defs total just **365 LOC** for 5 tools + registry | [measured] |
| Shared primitives reused | **12+**: typed API client, connector abstraction, RBAC matrix, audit writer, `DataTable`, schema `ActionForm`/`Modal`, `SearchFilterBar`, badges, toasts, loading/error/empty states, tool-definition engine | [measured] |
| New primitives required per added tool | **0** for tools #4 and #5. (The connector abstraction was a *one-time* infra addition; tool #5 then reused it as config — a new *instance*, not a new primitive.) | [measured] |
| Consistency of RBAC / validation / errors / UI states / audit | **Uniform by construction** — one role→permission matrix, one validation module, one audit writer, one error envelope, one render engine | [measured] |
| Ease of adding a tool with *different* requirements | FX Rates needed a **live external REST source** (not local SQL); handled by adding a connector config with **no engine change** — evidence the platform generalizes beyond CRUD-on-SQLite | [measured] |

---

## 3. Functional & security correctness
*Correct behavior, especially on dangerous paths?*

| Metric | Value | Source |
| --- | --- | --- |
| Required workflows completed | **3/3** (KYC, Refunds, Feature Flags) + Audit viewer + 2 extra tools | [measured] |
| Positive & negative coverage | 11 automated (incl. all **6 required adversarial** scenarios) + **40/40** API validation checks | [measured] |
| Authorization-bypass attempts | Role-header flip on writes → **403 + `denied` audit** (server-enforced; client gating is UX only) | [measured] |
| Validation failures | Refund settled-only / amount / reason / over-limit / double-refund; KYC mandatory note; rollout 0–100 bounds | [measured] |
| Audit completeness | Every mutating endpoint writes exactly one event; outcomes `success` / `denied` / `error` | [measured] |
| Consequential-action safeguards | Production flag writes require a **distinct Admin-only permission + explicit confirm** | [measured] |
| Can denied/failed actions look successful? | **No** — proven by tests + the audit-integrity checks in the matrix | [measured] |
| **Honest limit** | This is **not** production-readiness. Missing: load/soak, fuzz/property-based tests, negative-input coverage at scale, and an independent pen-test. 11 tests + 40 checks raise confidence but do not certify. | [measured gap] |

---

## 4. Operational simplicity
*Does building in-house actually simplify operations?*

**Verdict: the prototype does not prove this — and that is legitimate evidence *for* buying at the current scale.** Retool ships these; owning them is net-new work.

| Concern | Prototype today | Production requirement (owned by you) |
| --- | --- | --- |
| Deployment | Single-image Docker/compose (prototype artifact) | CD pipeline, staged rollout, rollback, zero-downtime, TLS/DNS in the VPC |
| Monitoring & alerting | None | Metrics, logs, tracing, dashboards, on-call alerts, SLOs |
| Database migrations | Seed script; ad-hoc schema | Versioned migrations, forward/back, zero-downtime |
| Backups & DR | None (SQLite file) | Managed DB, automated backups, tested restore, RPO/RTO |
| Secrets management | Env var / optional token | Vault/KMS, rotation, least-privilege, no plaintext |
| Auth & provisioning | Dev role selector | SSO/OIDC/SAML, SCIM, session mgmt, CSRF |
| Incident response | None | Runbooks, paging, postmortems, status comms |
| Dependency & security upgrades | Manual; `npm audit` shows open advisories | Continuous patching, CVE triage, supply-chain policy |

---

## 5. Long-term ownership
*Does Devin reduce the permanent maintenance burden, or only the initial coding burden?*

**Reframed as "changes long-term ownership cost."** Evidence: Devin sharply reduces **implementation/marginal-tool** cost; it does **not** remove ownership.

| Ownership dimension | Effect of Devin | Net |
| --- | --- | --- |
| Expected maintenance hours | Lower per-change coding time | Still **~0.25–0.5 FTE/yr** (likely the higher end in fintech) [estimated] |
| Connector ownership | Devin can *write* a connector fast | You still **own** auth, rate limits, versioning, breakage for each — Retool otherwise maintains these |
| Security patching | Devin can apply/PR patches | Human triage + review still required; accountability stays in-house |
| On-call burden | Unchanged | New burden you did not have with SaaS |
| Feature requests | Faster to implement | Backlog + prioritization now your team's |
| Compliance & audit | Devin can produce artifacts | You must **own** SOC-2-equivalent controls, evidence, retention |
| Human review when Devin changes **shared** infra | — | **Concentration risk:** a change to the engine/RBAC/audit touches *all* tools → careful review is mandatory, not optional |

---

## 6. Economics & opportunity cost
*Is there a credible financial advantage over $250K/year?*

**Assumptions (validate before quoting):** fully-loaded senior fintech engineer ≈ **$250K/yr** (~$21K/eng-month); Retool spend **$250K/yr**; production-hardening for the current 3 tools = **3–6 eng-months**; migration of the 3 existing tools (rebuild + parallel-run + cutover) = **1–2 eng-months**; maintenance **0.25–0.5 FTE/yr**.

| Cost line | In-house (build) | Notes |
| --- | --- | --- |
| One-time: production hardening | **$75K–$150K** | 3–6 eng-months + review/pentest/integration overhead |
| One-time: Retool migration | **$20K–$40K** | rebuild + data/user move + parallel run |
| Recurring: maintenance | **$62K–$125K/yr** | 0.25–0.5 FTE |
| Recurring: infra (hosting, DB, backups, monitoring) | **$10K–$30K/yr** | [estimated] |
| Recurring: third-party (IdP seats, connector vendor APIs, error tracking, annual pentest) | **$15K–$40K/yr** | [estimated] |
| Recurring: Devin ACUs (ongoing build/maintenance) | **$5K–$20K/yr** | [estimated — confirm] |
| **Recurring subtotal** | **~$92K–$215K/yr** | vs Retool **$250K/yr** |
| **Year-1 total (one-time + recurring)** | **~$187K–$405K** | vs Retool **$250K** |

**Reading the model honestly:**
- **Steady state** (year 2+): in-house recurring (~$92K–$215K) can undercut Retool's $250K — *if* maintenance stays at the low end and nothing major breaks.
- **Year 1** is a wash-to-worse once one-time hardening + migration are included, and you absorb execution risk Retool otherwise carries.
- **Payback** on the one-time spend is **~1–4 years** at the modeled savings — fragile, because the fintech-realistic case pushes maintenance/compliance to the high end and can erase the delta.
- **Opportunity cost is the decisive term at 3 tools:** pulling 1–2 senior engineers off customer-facing/revenue work for months at a Series C typically costs more than the license delta.

**Break-even tool count / timeframe:**
- Model in-house as a **mostly-fixed** annual cost (maintenance + infra + third-party ≈ $100K–$180K) with **near-zero marginal cost per new tool** (Devin makes tool N cheap — the 80s result). Retool cost tends to **scale** with seats/usage/tools.
- Therefore build becomes compelling when the portfolio is on a credible path to **~10–20+ tools**, or when Retool's next renewal/seat expansion materially raises the $250K. At **3 static tools**, buy wins on **risk-adjusted total cost + opportunity cost**, even though the naive annual arithmetic looks close.

**Bottom line (consistent with `BUILD_VS_BUY.md`):** don't wholesale-replace Retool for 3 tools today. Pilot in-house on net-new / integration-heavy tools, track the marginal-cost evidence, and revisit at the next renewal or once the tool count is clearly growing.

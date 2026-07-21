# Evaluation framework & metrics

The prototype is scored against four questions a VP of Engineering actually cares about:
**what does it cost, is it safe, what's the forever-burden, and who can build and change it.**
Each metric is tagged **[measured]** (from this repo / CI) or **[estimated]** (a modeled figure
with stated assumptions — validate before quoting).

---

## 1. Economics & total cost of ownership
*Is there a credible financial advantage over $250K/year?*

### Engineering leverage

| Metric | Value | Source |
| --- | --- | --- |
| Active build time | **~1h45m** of active work (excludes idle time between sessions; this is effort, not wall-clock) | [measured] |
| Human vs Devin time | Human ~30–45m (prompts, decisions, review); the rest is Devin generating, running, and testing | [estimated] |
| Rework | **Low** — a few review/lint fixes, no architectural rework | [measured] |
| Code generated | **~2,400 lines** of TS/TSX, the large majority Devin-generated | [measured] |
| Tests | **9** automated (vitest + supertest) plus an adversarial API validation pass (RBAC, refund edge cases, flag safeguards, KYC validation, audit integrity) | [measured] |
| Devin compute cost | **~$16** total for the whole engagement (≈ $0.006/LOC) | [measured] |

### Marginal cost of the next tool

Reported as two numbers so it isn't cherry-picked to the easiest case:

| Case | Result |
| --- | --- |
| **Floor** — adding a structurally similar CRUD tool | **~80 seconds**, ~130 LOC, **0 new primitives** — nearly free |
| **Ceiling** — a genuinely different, non-CRUD tool (Operations Analytics dashboard) | **~15 minutes**, **1 new reusable primitive** (chart/aggregation), then reusable |

The honest signal is "one new primitive, then free again" — more believable than "everything takes
80 seconds." A second table-style tool is nearly free; a new *type* of tool costs one primitive.

### The money model

**Assumptions.** Fully-loaded senior fintech engineer ≈ **$190K–$250K/yr**. Retool ≈ **$250K/yr**.
Production-hardening the current tools ≈ **7–14 engineer-weeks**. Migration ≈ **4–8 engineer-weeks**.
Ongoing maintenance ≈ **0.25–0.5 FTE/yr**.

> **Effort ≠ calendar.** The build is 7–14 engineer-weeks of *construction*, but
> calendar-to-production stays **~3–6 months** because security review, vendor integration, and
> pen-testing are gated by elapsed time and approvals, not typing speed.

| Cost line | In-house | Notes |
| --- | --- | --- |
| One-time: production hardening (human) | **$30K–$80K** | build + review/pen-test/integration |
| One-time: Retool migration | **$15K–$40K** | rebuild + data/user move + parallel run |
| One-time: Devin compute | **$3K–$10K** | immaterial |
| Recurring: maintenance (human) | **$48K–$125K/yr** | 0.25–0.5 FTE |
| Recurring: infra + third-party (hosting, DB, backups, IdP, pen-test) | **$25K–$70K/yr** | [estimated] |
| Recurring: hybrid dual-running | **$10K–$30K/yr** | two auth systems + two places to debug, while the 3 existing tools stay on Retool |
| Recurring: Devin compute | **$1K–$4K/yr** | a rounding error |

**Break-even.** In-house is a mostly-fixed annual cost with near-zero marginal cost per new tool;
Retool scales with seats/usage/tools. Building becomes compelling on a credible path to **~10–20+
tools** or at the next Retool renewal. At **3 static tools**, buying wins on risk-adjusted total
cost and opportunity cost. Devin collapses *implementation* cost toward zero, but the decision is
dominated by human time, ownership, opportunity cost, and calendar — none of which Devin's ~$16
compute changes.

---

## 2. Security & correctness
*Correct behavior, especially on dangerous paths?*

| Metric | Value |
| --- | --- |
| Required workflows completed | **3/3** (KYC, Refunds, Feature Flags) + an Operations Analytics dashboard and an Audit viewer |
| Authorization | Enforced **server-side**; a role-flip on any write returns **403 + a `denied` audit event** (client gating is UX only) |
| Validation | Refund settled-only / amount / over-limit / double-refund; KYC mandatory note; rollout 0–100 bounds |
| Audit | Every mutating endpoint writes exactly one event with outcome `success` / `denied` / `error` |
| Consequential-action safeguards | Production flag writes require a distinct Admin-only permission + explicit confirmation |
| Can denied/failed actions look successful? | **No** — proven by tests and audit-integrity checks |

**Honest limit.** The suite covers positive paths, authorization, and input validation. It does
**not** include concurrency/race, fuzz, load, or independent penetration testing. This raises
confidence but **does not certify production readiness** — and for KYC/refunds/prod-flags in a
fintech, the concurrency and pen-test gaps are exactly what must close before go-live.

---

## 3. Ownership & operations
*What does it cost to run and own this forever?*

**Verdict: the prototype does not prove operational simplicity — and that is legitimate evidence
*for* buying at this scale.** Retool ships these; owning them is net-new, permanent work. Devin
reduces implementation cost; it does not remove ownership.

| Concern | Prototype today | Production requirement (owned by you) |
| --- | --- | --- |
| Deployment | Single-image Docker/compose | CD pipeline, staged rollout, rollback, TLS/DNS in the VPC |
| Monitoring & alerting | None | Metrics, logs, tracing, on-call alerts, SLOs |
| Migrations / backups / DR | Seed script, SQLite file | Versioned migrations, managed DB, tested restore, RPO/RTO |
| Secrets management | Env var | Vault/KMS, rotation, least-privilege |
| Auth & provisioning | Dev role selector | SSO/OIDC/SAML, SCIM, sessions, CSRF |
| Incident response | None | Runbooks, paging, postmortems |
| Dependency / security upgrades | Manual | Continuous patching, CVE triage, supply-chain policy |

**Reliability is asymmetric.** KYC and refunds are low-volume, human-in-the-loop, and tolerate
downtime with a manual fallback — which slightly favors build. The **feature-flag panel is the
exception**: it can gate live customer behavior, so if it's down when you need a kill-switch that's
a real incident. That one tool needs production-grade reliability or should stay on Retool.

**On ownership, Devin helps write the code but does not remove the burden:** you still own connector
breakage, security patching, on-call, and compliance evidence. And because every tool shares one
engine/RBAC/audit layer, a change to shared infrastructure touches *all* tools — a concentration
risk that makes human review mandatory.

---

## 4. Flexibility & authoring
*Who can build/modify tools, and how far can they bend them?*

| Dimension | Retool | In-house (this prototype) | Read |
| --- | --- | --- | --- |
| Authoring accessibility | Semi-technical ops self-serve in the visual builder | Engineer writing TypeScript (a tool = a definition file) | **Favors Retool** — every change is an engineering ticket |
| Customization ceiling | Constrained to what the platform exposes | Unlimited — it's your code | **Favors build**, but rarely hit for 3 commodity tools |
| Integration reach | 100+ maintained connectors | Whatever you build and own | Retool wins unless you're willing to own the integration |
| Lock-in / exit cost | Apps live in Retool's format | Plain TS in your repo, portable | **Favors build** on portability |

**Honest finding:** authoring accessibility favors Retool, customization and portability favor
build, but **for three simple tools neither edge is large**. The "full control" upside becomes
decisive only if the roadmap includes tools Retool can't express, or if non-engineer self-service
is a hard requirement (which argues *for* Retool).

---

## Bottom line

Don't wholesale-replace Retool for three tools today. The build is a closer call than a naive
estimate implies, but ownership burden, opportunity cost, the hybrid dual-running reality, and the
flag panel's reliability stakes keep **buy** ahead at this scale. Pilot in-house on **net-new /
integration-heavy** tools, track the marginal-cost evidence (the ~80s floor and the ~15-min "new
primitive" ceiling), and revisit at the next renewal or once the tool count is on a credible path
to ~10–20+.

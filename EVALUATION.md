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

**Assumptions.** Every dollar below is derived from **hours × one rate** so the figures stay
internally consistent. Fully-loaded senior fintech engineer ≈ **$150/hr** (~$300K/yr loaded over
~2,000 productive hours). Retool ≈ **$250K/yr**.

> **Effort ≠ calendar.** With Devin writing the code, the *engineering effort* to productionize is
> small; the *calendar* is not. Security review and a pen-test for KYC + refunds are gated by
> elapsed time and approvals, not typing speed — so active effort can be ~1–2.5 weeks while
> calendar-to-live is still **~4–8 weeks**.

| Cost line | Hours | In-house $ | Notes |
| --- | --- | --- | --- |
| One-time: production hardening (human) | **40–100 hrs** | **$6K–$15K** | real auth/SSO, deploy, monitoring, tests, integrations, review — *not* rebuilding the platform (Devin already did that) |
| One-time: Retool migration | 30–70 hrs | **$5K–$10K** | rebuild config + data/user move + parallel run |
| One-time: Devin compute | — | **~$16** | the whole prototype; immaterial |
| Recurring: maintenance (human) | **40–100 hrs/yr** | **$6K–$15K/yr** | ~0.02–0.05 FTE — a monthly check plus occasional fixes; **trends down** as Devin absorbs routine changes |
| Recurring: infra + third-party (hosting, DB, backups, IdP, pen-test) | — | **$25K–$70K/yr** | [estimated] — mostly vendor spend, not engineering |
| Recurring: Devin compute | — | **~$0.2K–0.5K/yr** | e.g. 200 runs × ~$2; less than three engineer-hours |

**Why maintenance declines.** Routine work — bug fixes, dependency bumps, connector updates, small
feature requests — is exactly what Devin accelerates, so per-change cost keeps falling as the
platform matures. What does *not* go to zero is the ownership floor: someone must stay accountable
for incidents and security on tools that touch KYC, refunds, and production flags. That floor is
human accountability, not engineering hours.

**Break-even.** In-house is a mostly-fixed, modest annual cost with **near-zero and falling**
marginal cost per new tool; Retool scales with seats/usage/tools. The reconciled numbers make the
*engineering* case for building cheaper than a traditional estimate would — build effort is ~1–2.5
weeks and maintenance is a fraction of an FTE. The decision therefore turns less on cost and more on
**how many tools you'll have** and **how much platform ownership you want**: at **3 static tools**,
buying still wins on risk and focus; on a credible path to **~10–20+ tools**, the near-zero marginal
cost makes building compelling. Devin's compute never enters the decision.

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

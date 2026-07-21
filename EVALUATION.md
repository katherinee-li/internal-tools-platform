# Evaluation framework & metrics

This scores the prototype against a **four-criterion** framework. Each metric is tagged
**[measured]** (from this repo / CI / the journal) or **[estimated]** (a modeled figure with
stated assumptions — validate before quoting to a decision-maker).

**Why four criteria, not six.** An earlier draft used six (engineering leverage, extensibility,
correctness, operational simplicity, long-term ownership, economics). Two of those are really
*cost inputs* and two are really *one* thing, so they were consolidated:

- **Build-time** leverage + standardization ("how cheap is tool N?") are inputs to the money
  question → folded into **Economics**. Leverage that doesn't move the dollar answer is trivia.
- **Operational simplicity** + **long-term ownership** answer the same question ("what does it
  cost to *run and own* this forever?") → merged into **Ownership & operations**.
- Added **Flexibility & authoring** — the VP explicitly asked about "full customization control"
  and *who* can build tools, which the cost lens alone misses.

Consolidating headline count, **not** evidence: each criterion still lists its hard metrics.

> **Confounder to keep in mind:** the single largest driver of the results below was a *human*
> architectural decision — to build a declarative tool-definition **engine** instead of N
> hand-written pages. No elapsed-time metric captures that judgment call, and it is exactly the
> kind of decision a team still has to make well for Devin's speed to pay off.

The four criteria answer four distinct VP questions: **what does it cost, is it safe, what's the
forever-burden, and who can actually use and extend it.**

---

## 1. Economics & total cost of ownership
*Is there a credible financial advantage over $250K/year — including build, marginal, and opportunity cost?*

### 1a. Engineering leverage (cost inputs)

| Metric | Value | Source |
| --- | --- | --- |
| Total elapsed build time | Working software ~20–25m; cumulative incl. tests/PR/testing/docs/enhancements ≈ **~3.3h active** (excludes an idle break between sessions — this is duration, not wall-clock) | [measured] journal timeline |
| Active human time vs Devin execution | Human ≈ **30–45m** (prompts, decisions, review); remainder is Devin generating/running + automated/UI testing | [estimated] |
| Prompts / interventions | ~**30–40** user turns across the whole engagement | [estimated] |
| Rework / corrections | **Low**: 3 Devin Review fixes (ISO seed dates ×2, CORS) + a handful of lint/type fixes; no architectural rework | [measured] |
| LOC generated | **~2,800** lines TS/TSX (+ docs), large majority Devin-generated | [measured] `wc -l` |
| Tests generated | **12** automated (vitest+supertest) + a **40-check** API validation harness | [measured] |
| Devin usage / ACUs & cost | **~$16.47** total for the engagement (from the usage dashboard) ≈ **$5/active Devin-hour, ~$0.006/LOC** | [measured] |

### 1b. Marginal cost of the next tool — the two-number result

The most decision-relevant leverage number is *how cheap is tool N*, reported honestly as **two**
numbers so it isn't cherry-picked to the easiest case:

| Case | Result | What it proves |
| --- | --- | --- |
| **Floor** — a structurally-identical CRUD tool (Support Tickets, tool #4) | **~80s**, 2 files, ~130 LOC, **0 new primitives**, mostly configuration | the *best* case: another table-list-form tool on the existing engine is nearly free |
| **Realistic** — a genuinely *different* tool: live external data (FX Rates, tool #5) | ~**30 LOC** config on a **one-time** connector primitive, no engine change | a new *data source* is config once the connector seam exists |
| **Realistic** — a **non-CRUD** analytics dashboard (Operations Analytics, tool #6) | ~**15 min** end-to-end; **1 new reusable primitive** (chart/aggregation, ~170 LOC) + ~120 LOC workflow (aggregation endpoint + dashboard config) + a test | a tool that *doesn't* fit the table engine costs **one new primitive**, then is reusable — the honest ceiling on marginal cost |

**Read this honestly:** the 80s figure is the *floor* (the flattering case). The dashboard is the
truthful signal — a *second type* of tool needs one new primitive and takes minutes, not seconds,
and any *third* dashboard would then be config again. That "one primitive, then free" pattern is
the real extensibility story, and it's more believable than "everything took 80 seconds."

### 1c. Configuration vs custom logic (characterized from the diff, not a false %)

Rather than a spuriously precise percentage, the hard facts from the diffs:

- Tool #4 (CRUD): **2 files, ~130 LOC, 0 new components** — almost entirely a declarative definition.
- Tool #6 (dashboard): **~120 LOC workflow** (a config object + one aggregation query) on top of a
  **~170 LOC** reusable primitive built once.
- Reusable substrate ≈ **~1,800 LOC** (shared contracts, web platform engine, chart primitive,
  server infra) is reused by every tool; per-tool definitions are **small** by comparison.
- **12+ shared primitives**: typed API client, connector abstraction, chart/aggregation primitive,
  RBAC matrix, audit writer, `DataTable`, schema `ActionForm`/`Modal`, `SearchFilterBar`, badges,
  toasts, loading/error/empty states, tool-definition + dashboard-definition engines.

### 1d. The money model

**Assumptions (validate before quoting).** Fully-loaded senior fintech engineer ≈ **$190K–$250K/yr**
(shown as a band — the answer should not hinge on one wage number) ≈ **$3.7K–$4.8K/eng-week**.
Retool spend **$250K/yr**. **Corrected** production-hardening for the current 3 tools = **~7–14
eng-weeks of build effort** (down from an earlier 3–6 eng-*month* estimate that was priced as if
auth/infra were built from scratch — a Series C already running Retool has an IdP and cloud infra;
see `BUILD_VS_BUY.md` §3 for the per-line correction). Migration = **~4–8 eng-weeks**. Maintenance
**0.25–0.5 FTE/yr**.

> **Effort ≠ calendar.** The 7–14 eng-weeks is *construction*. Calendar-to-production stays **~3–6
> months** (compressible toward ~4–8 weeks with full org commitment) because of external-vendor,
> pen-test, and change-management *elapsed-time* floors that faster coding cannot remove. Don't
> "correct" the calendar down the way the effort was corrected down — they're different axes.

| Cost line | In-house (build) | Notes |
| --- | --- | --- |
| One-time: production hardening (human) | **$30K–$80K** | ~7–14 eng-weeks + review/pen-test/integration overhead (was $75K–$150K; revised for existing IdP/infra) |
| One-time: Devin compute for that build | **$3K–$10K** | extrapolated from the measured ~$16.47 prototype — immaterial |
| One-time: Retool migration | **$15K–$40K** | rebuild + data/user move + parallel run |
| Recurring: maintenance (human) | **$48K–$125K/yr** | 0.25–0.5 FTE at the wage band |
| Recurring: infra (hosting, DB, backups, monitoring) | **$10K–$30K/yr** | [estimated] |
| Recurring: third-party (IdP seats, connector vendor APIs, error tracking, annual pen-test) | **$15K–$40K/yr** | [estimated] |
| Recurring: **hybrid dual-running overhead** | **$10K–$30K/yr** | two auth systems + two places engineers look + context-switching, *while the recommended hybrid keeps the 3 existing tools on Retool* (so much of the $250K license persists) — this cost is invisible in a naive build-vs-buy subtraction |
| Recurring: Devin ACUs (ongoing build/maintenance) | **$1K–$4K/yr** | a rounding error |
| **Recurring subtotal (in-house portion)** | **~$84K–$229K/yr** | and note the hybrid path means Retool spend does **not** drop to $0 |

**Reading the model honestly:**
- The **corrected, lower build effort shifts economics toward build** — one-time human cost roughly
  halves. This makes the call **closer to a coin-flip**, which is fine: an honest close call beats
  a confident one resting on inflated numbers.
- **But it does not flip the recommendation at 3 tools.** The decisive terms — ownership burden
  (§3), **opportunity cost** of pulling 1–2 senior engineers off revenue work, and the **hybrid
  dual-running reality** (you keep paying for Retool on the legacy 3 tools) — **do not shrink** when
  coding gets faster.
- **Devin's compute cost never moves the decision** (~$3K–$10K one-time, ~$1K–$4K/yr). Devin
  collapses *implementation* cost toward zero; human time, ownership, opportunity cost, and calendar
  dominate.

**Break-even tool count / timeframe:**
- Model in-house as a **mostly-fixed** annual cost (maintenance + infra + third-party ≈ $75K–$195K)
  with **near-zero marginal cost per new tool** (the 80s / 15-min results). Retool tends to **scale**
  with seats/usage/tools.
- So build becomes compelling on a credible path to **~10–20+ tools**, or when Retool's next
  renewal/seat expansion materially raises the $250K. At **3 static tools**, buy wins on
  risk-adjusted total cost + opportunity cost even though the naive annual arithmetic is close.

---

## 2. Security & correctness
*Correct behavior, especially on dangerous paths?*

| Metric | Value | Source |
| --- | --- | --- |
| Required workflows completed | **3/3** (KYC, Refunds, Feature Flags) + Audit viewer + 3 extra tools | [measured] |
| Positive & negative coverage | 12 automated (incl. all **6 required adversarial** scenarios) + **40/40** API validation checks | [measured] |
| Authorization-bypass attempts | Role-header flip on writes → **403 + `denied` audit** (server-enforced; client gating is UX only) | [measured] |
| Validation failures | Refund settled-only / amount / reason / over-limit / double-refund; KYC mandatory note; rollout 0–100 bounds | [measured] |
| Audit completeness | Every mutating endpoint writes exactly one event; outcomes `success` / `denied` / `error` | [measured] |
| Consequential-action safeguards | Production flag writes require a **distinct Admin-only permission + explicit confirm** | [measured] |
| Can denied/failed actions look successful? | **No** — proven by tests + the audit-integrity checks | [measured] |

**Honest limit — what class of tests is missing (not just "more tests"):** the suite is
positive-path + authorization + input-validation. It does **not** include: **concurrency / race
conditions** (e.g. two simultaneous refunds racing the remaining-balance check; audit-log write
ordering under load), **fuzz / property-based** input testing, **load / soak** testing, or an
independent **penetration test**. 12 tests + 40 checks raise confidence but **do not certify
production readiness** — and for KYC/refunds/prod-flags in a fintech, the concurrency and pen-test
gaps specifically are the ones that must close before go-live.

---

## 3. Ownership & operations
*What does it cost to run and own this forever? (operational simplicity + long-term ownership + reliability)*

**Verdict: the prototype does not prove operational simplicity — and that is legitimate evidence
*for* buying at the current scale.** Retool ships these; owning them is net-new, permanent work.
Devin sharply reduces **implementation/marginal-tool** cost; it does **not** remove ownership.

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

**Reliability / downtime tolerance (folded in here, not its own axis) — and it's asymmetric:**

| Tool | Downtime tolerance | Blast radius | Manual fallback? |
| --- | --- | --- | --- |
| KYC review queue | **High** — low-QPS, human-in-the-loop; a 30-min outage delays analysts, not customers | Internal only | Yes (process by hand) |
| Refunds dashboard | **Moderate** — internal, but SLA-sensitive to customers awaiting refunds | Mostly internal | Partial (manual/Stripe console) |
| Feature-flag panel | **LOW tolerance / high stakes** — a flag can gate live customer behavior; if it's down when you need a kill-switch, that's a real incident | **Customer-facing** | Weak (emergency config change) |

Takeaway: two of three tools **tolerate downtime with a manual fallback**, which slightly *favors*
build (you don't need SLA-grade uptime for a tool three analysts use). The **flag panel is the
exception** and is the one component that genuinely needs production-grade reliability if built
in-house — a sharper observation than a blanket "downtime is bad," and one that argues for either
keeping the flag tool on Retool or holding it to a higher engineering bar.

| Ownership dimension | Effect of Devin | Net |
| --- | --- | --- |
| Expected maintenance hours | Lower per-change coding time | Still **~0.25–0.5 FTE/yr** (likely the higher end in fintech) [estimated] |
| Connector ownership | Devin can *write* a connector fast | You still **own** auth, rate limits, versioning, breakage for each — Retool otherwise maintains these |
| Security patching | Devin can apply/PR patches | Human triage + review still required; accountability stays in-house |
| On-call burden | Unchanged | New burden you did not have with SaaS |
| Compliance & audit | Devin can produce artifacts | You must **own** SOC-2-equivalent controls, evidence, retention |
| Human review when Devin changes **shared** infra | — | **Concentration risk:** a change to the engine/RBAC/audit/chart primitive touches *all* tools → careful review is mandatory, not optional |

---

## 4. Flexibility & authoring
*Who can build/modify tools, and how far can they bend them? (the VP's "full customization control")*

Two different things live here; only one favors each side:

| Metric | Retool | In-house (this prototype) | Honest read |
| --- | --- | --- | --- |
| **Authoring accessibility** — min. skill to create/modify a tool | Semi-technical ops/analysts self-serve in the visual builder | **Engineer writing TypeScript** (a tool = a definition file) | **Favors Retool.** Every new/changed tool is an engineering ticket → latency + eng load. This is a cost/velocity issue in disguise (feeds §1). |
| **Customization ceiling** — how far you can bend it | Constrained to what the platform exposes; can hit walls on bespoke UI/logic/integrations | **Unlimited — it's your code** | **Favors build**, but for these **3 commodity CRUD/dashboard tools the ceiling is rarely hit**, so the upside is small *today*. |
| **Integration reach** | 100+ maintained connectors; deep on common SaaS | Whatever you build; the connector seam is proven (live REST) but the *catalog* is yours to own | Even for internal/bespoke systems Retool handles poorly, in-house wins only if you're willing to own the integration. |
| **Lock-in / exit cost** | Apps live in Retool's format; leaving = rebuild | Plain TS in your repo; portable | **Favors build** on portability, but partly offset by owning everything forever (§3). |

**Honest finding:** authoring accessibility **favors Retool** (non-engineers self-serve), while
customization ceiling and lock-in **favor build** — but **for these three simple tools neither edge
is large**. The "full control" upside the VP is paying attention to is real but under-exercised at
3 commodity tools; it becomes decisive only if the roadmap includes tools Retool genuinely can't
express, or if self-serve authoring by non-engineers is a hard requirement (which argues *for*
Retool).

---

## Bottom line (consistent with `BUILD_VS_BUY.md`)

Don't wholesale-replace Retool for 3 tools today. The corrected (lower) build effort makes it a
**closer call than the original estimate implied**, but ownership burden, opportunity cost, the
hybrid dual-running reality, and the flag panel's reliability stakes keep **buy** ahead at this
scale. Pilot in-house on **net-new / integration-heavy** tools, track the marginal-cost evidence
(the 80s floor and the ~15-min "new primitive" ceiling), and revisit at the next renewal or once the
tool count is on a credible path to ~10–20+.

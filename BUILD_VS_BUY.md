# Build vs. Buy: Replace Retool with a Devin-built internal-tools platform?

**Audience:** VP of Engineering, Series C fintech (~60 engineers, ~$250k/yr Retool, 3 internal apps today).

**Central question:** Can Devin replace the *reusable platform* that makes KYC, refunds, feature flags, and the next fifty internal tools inexpensive to build and maintain?

**Short answer:** Devin can reproduce the reusable *engineering* primitives quickly and well — the prototype proves it. But Retool's $250k isn't mostly buying those primitives; it's buying the **hosted, governed, maintained platform** (auth/SSO, audit integrity, connectors, deployment, monitoring, upgrades, support). For **three** tools, building and *owning* that undifferentiated platform is unlikely to beat buying. The decision flips toward build only if the internal-tools surface is going to grow substantially or needs integration Retool can't provide. Recommendation below is a **staged/hybrid** path.

---

## 1. What Retool capabilities were successfully replicated

The prototype reproduces the core reusable platform layer:

- **Reusable data layer** — one typed API client with uniform auth + error handling.
- **Reusable UI components** — table, schema-driven form, search/filter bar, modal/confirm, badges, toasts, loading/error/empty states, app shell + nav.
- **Declarative "tool-definition" engine** — a new tool is a config object; the engine renders the whole screen. Marginal cost of tool #4 was measured at ~80s of coding / ~130 LOC / **no new primitives** (see journal).
- **Role-based access control** — a single role→permission matrix, **enforced server-side**, with the client using the same matrix to gate UX.
- **Audit logging** — one append-only pipeline capturing every mutating action (success/denied/error) across all tools.
- **Consequential-action safeguards** — production flag writes require a distinct Admin-only permission plus explicit confirmation.
- **Validation & confirmation flows** — shared validators (refund ≤ refundable, settled-only, mandatory KYC note) enforced on the server.
- **Connector abstraction (thin slice)** — a single `Connector` interface with a `SqliteConnector` (local DB) and a `RestConnector` (live external HTTP APIs; auth header injected centrally, timeouts, uniform error mapping). The **FX Rates** tool reads from a *live* third-party API through it, proving the platform is not limited to mock data and that a new data source is just another connector.
- **Charts / aggregation primitive (non-CRUD)** — a separate chart primitive + declarative `DashboardDefinition` engine (KPIs + bar/column widgets over aggregated `GROUP BY` queries). The **Operations Analytics** tool (refund trend, KYC funnel, refund reasons) proves the platform generalizes past table-list-form CRUD; dashboards are a large share of what fintechs actually use Retool for.
- **Deployable artifact + CI** — a Dockerfile/`docker compose` runs the whole app as one container (web served from the API process), and GitHub Actions runs lint/typecheck/test/build on every push/PR.
- **All three required workflows + a fourth (CRUD) + a live-data fifth + a non-CRUD analytics sixth tool**, visibly built on the same platform.

## 2. What remains missing compared to Retool

Retool is far more than these primitives. Not attempted (and material):

- **Visual/low-code builder** — drag-and-drop app building; **non-engineers** can build and iterate. The prototype requires engineers writing TypeScript.
- **Managed connectors (breadth)** — we built the *connector seam* and one live REST connector, but Retool ships **100+ maintained integrations** (Postgres, Stripe, Snowflake, GraphQL, SaaS APIs) with auth, pagination, and rate-limits handled and **kept up to date for you**. Owning connectors means building and maintaining each one yourself — the abstraction is cheap; the catalog and its upkeep are the real cost.
- **Real identity** — SSO/SAML/OIDC, SCIM provisioning, sessions. We use a dev role selector.
- **Hosting & deployment (managed)** — we produce a working container and CI, but Retool offers one-click cloud or self-hosted (Docker/K8s) deploys with **upgrades, backups, and scaling handled**. Our container is a prototype artifact, not a hardened, monitored, auto-upgraded deployment.
- **Governance at scale** — audit export/retention, environment promotion, granular permission groups, change management, protected resources, source control sync.
- **Operational surface** — monitoring, usage analytics, SLAs/support, security certifications (SOC 2, etc.), workflows/automation (cron), query library, modules, mobile.

## 3. Estimated engineering effort to reach production quality

Taking the prototype to a **production-grade platform for the current 3 tools** (not feature-parity with Retool). **Read the two right-hand columns separately** — "build effort" is how much *construction* work there is; "calendar" is how long it takes to actually ship in a regulated fintech, which is dominated by review/integration/approval latency, not typing.

**Key assumption (drives the low end):** a Series C fintech already running Retool **already has an IdP (Okta/Azure AD) and cloud infra + monitoring**. So auth and deployment are *integration onto existing systems*, not greenfield builds — the realistic case is the low end of each range, not the high.

| Area | Build effort (eng-weeks) | Why (correction vs. an earlier from-scratch estimate) |
| --- | --- | --- |
| Auth (SSO/OIDC, sessions, CSRF, SCIM) | **0.5–1.5** | Integrating an *existing* IdP via a library (next-auth/Auth0) is days; SCIM is the only real time-add. Earlier estimate priced this like building auth from scratch. |
| Postgres + migrations + 3 real connectors (Stripe, KYC vendor, flag store) | **2–4** | Three specific, well-documented API integrations. Balloons only if you build a *generic* connector framework — which you shouldn't for 3 tools. |
| Audit integrity (append-only, retention, SIEM export) | **0.5–1** | Append-only table + no-update trigger is ~a day; hash-chaining a bit more; SIEM export is mostly shipping logs to existing Datadog/Splunk. |
| RBAC admin UI + record-level perms + maker-checker | **1.5–3** | Genuinely real product logic (esp. maker-checker/dual-approval). |
| Deployment (VPC, TLS, CI/CD), monitoring, alerting | **0.5–1.5** | They already run cloud infra + monitoring (they run Retool). Deploying 3 services onto existing infra is days, not weeks-from-zero. |
| Hardening (rate limits, edge validation, secrets, pen-test fixes) | **1–2** + pen-test contingency | Base hardening is quick if disciplined; pen-test fixes are unknowable pre-test → contingency, not a fixed line. |
| Accessibility, polish, docs, runbooks | **1–2** | — |
| **Total build effort** | **~7–14 eng-weeks (~1.5–3.5 mo)** | Low end = existing IdP + infra (the realistic case); high end = more built from scratch. |

> **Correction note.** An earlier draft put this at **13–25 eng-weeks / 3–6 engineer-months**. That was priced as if auth and infrastructure were greenfield. Corrected for a fintech that already operates an IdP and cloud infra, the *build effort* is roughly **half**. This shifts the economics (§8 / `EVALUATION.md`) toward build and makes the call closer — but see the calendar point below, which does **not** shrink the same way.

**Effort vs. calendar — the distinction that matters most here:**

- **Build effort ≈ 7–14 engineer-weeks** of construction. Devin compresses the code-writing sharply (the reusable platform layer in this repo was built in ~20 minutes of Devin time), and with parallel subagents on independent tools/connectors the *coding* wall-clock can shrink further to **~1–2 weeks**.
- **Calendar-to-production ≈ 3–6 months regardless**, because the long pole is **not code**. It's integration with external parties (vendor sandbox/prod credentials, IdP provisioning, infra procurement), security/compliance review and sign-off, and elapsed-time gates (pen-test windows, change-management burn-in, SOC 2 observation, data-migration validation).
- **Can you compress the calendar?** Partly. If the org goes all-in — everyone available, reviews/approvals returned in minutes not days — you collapse the **queue/wait latency**, which is the biggest single chunk, and months → **weeks (~4–8)** becomes plausible when combined with subagents. But three floors don't move: (a) **external parties on their own clock** (Stripe/KYC vendor/IdP), (b) **elapsed-time requirements** (pen-test, burn-in, audit windows), and (c) **sequential chains** (can't review unbuilt code, can't pentest before staging). And rushing approvals only helps if they stay *real* reviews — rubber-stamping refund/KYC/prod-flag tooling destroys the governance value that justified owning the platform. "Everyone always available" is also not free: it's real opportunity cost for security/IT/compliance.

Bottom line for this section: Devin (plus subagents and a committed org) makes the *build* fast and can take the calendar from months toward weeks — but not to days. The residual months are ownership, integration, and governance work, not construction.

## 4. Estimated ongoing maintenance burden

- **Steady state: ~0.25–0.5 FTE** for a small internal platform — dependency/security upgrades, connector maintenance, bug fixes, feature requests, incident response/on-call. Scales up with tool count, usage, and integration breadth.
- This is the number that matters most: with Retool, this burden is largely **outsourced** (their engineers patch, upgrade, and secure the platform). Owning it means it's **yours forever**, and it competes with product roadmap work.

## 5. Infrastructure & operational considerations

- Hosting (VPC), TLS/certs, secrets management, backups/DR for the audit + app DBs, CI/CD, observability (metrics/logs/traces), alerting, and on-call rotation.
- For a **fintech**, the audit log and consequential actions (refunds, KYC decisions, prod flags) are compliance-relevant — the operational bar is higher than for a typical internal tool.

## 6. Security & governance gaps (prototype → production)

- **Auth:** dev role selector → real IdP, MFA, session management, SCIM.
- **Audit integrity:** app-writable SQLite table → tamper-evident, retained, exportable log.
- **Access control:** coarse matrix → fine-grained, record-scoped, with approval workflows for high-risk actions.
- **Data protection:** no encryption/PII handling → encryption at rest/in transit, PII minimization, data-access logging.
- **Compliance:** none → SOC 2 controls, change management, segregation of duties, vendor-equivalent assurances you now must produce yourself.

## 7. Approximate prototype development effort

Measured as relative elapsed time (durations, not clock times; T+0 = first scaffold commit). Full breakdown in `ENGINEERING_JOURNAL.md`.

| Phase | Duration | Cumulative |
| --- | --- | --- |
| Hands-on **construction** of the platform + all 3 workflows + 4th tool + audit viewer | ~20–25m | 0:25 |
| Adversarial tests + lint/typecheck/build gates + docs | (incl. above) | 0:25 |
| Push + open PR + 3 Devin Review fixes + blueprint | ~12m | 0:37 |
| End-to-end UI testing + annotated recording + report + PR comment | ~38m | 1:15 |
| **Phase 2 (post-review):** effort/calendar estimate rework | ~10m | 1:25 |
| Connector abstraction + live FX tool + connector tests | ~45m | 2:10 |
| Docker single-image + `docker compose` + GitHub Actions CI | ~30m | 2:40 |
| 40-check API validation pass | ~15m | 2:55 |
| Docs updates + push + CI green | ~10m | 3:05 |
| **Phase 3 (framework revision):** eval framework restructured to 4 criteria | ~15m | 3:20 |
| Non-CRUD analytics dashboard (new chart primitive) + test + demo data | ~15m | 3:35 |
| Corrected estimates + break-even + docs + push | ~15m | 3:50 |

- **Cumulative ≈ 3h50m active** (~2,800 LOC of TypeScript, the large majority generated by Devin). This is *active duration* and excludes an idle break between sessions — not wall-clock elapsed. It exceeds the exercise's ~2h prototype guideline because most of it is evaluation-strengthening work (connectors, Docker/CI, a non-CRUD tool, validation, and analysis docs) done *after* the initial prototype, at the client's request; the initial working prototype itself was ~20–25m.
- **The headline:** the *working software* — platform, all workflows, the connector seam, the live-data tool, the non-CRUD dashboard, the container, and CI — was built in a small fraction of that; the rest is review, testing, recording, and docs. Evidence: this repo + engineering journal + the passing CI check on the PR.

## 8. Approximate production development effort

- **Build effort ≈ 7–14 engineer-weeks (~1.5–3.5 months)** for a hardened v1 covering the current 3 tools (Section 3), assuming an existing IdP + cloud infra (the realistic case for a fintech already running Retool). The *coding* portion is Devin-compressed and subagent-parallelizable (down to ~1–2 weeks of wall-clock construction).
- **Calendar-to-production ≈ 3–6 months** under normal operations, dominated by security/compliance review, external-vendor/IdP integration, and elapsed-time gates — **not** code volume. Note the calendar does **not** halve when the build effort does; the floors are approval/vendor/elapsed-time bound. A fully-committed org (instant reviews/approvals) plus subagents can compress this toward **~4–8 weeks**, but external-party, elapsed-time, and sequential floors keep it from reaching days (Section 3).
- **Ongoing ≈ 0.25–0.5 FTE** (Section 4) — unaffected by build speed; this is the recurring ownership cost.
- Feature-parity with Retool's builder/connectors/governance would be materially more and is not recommended to attempt.

## 9. Where Devin provided the greatest leverage

- Building the **reusable platform layer** and repetitive-but-exacting components (typed client, table/form/filter engine, seed data).
- **Marginal tool creation (reported as two honest numbers)** — a structurally-identical CRUD tool (#4) was ~80s / 0 new primitives (the *floor*); a genuinely different non-CRUD analytics dashboard (#6) took ~15 min and needed *one* new reusable primitive, then would be config again. "One primitive, then free" is the real, credible extensibility story — not "everything took 80 seconds."
- **Test generation** from explicit adversarial scenarios; quick, correct, and comprehensive.
- Overall: Devin is strongest exactly where Retool's *build-time* value lives (spinning up CRUD tools fast).

## 10. Where Devin was least effective

- **Not a code problem:** the decisions that mattered most — invest in an engine vs. three pages, RBAC model design, what to make a primitive, whether to parallelize — were human architectural judgment. A naive "build three screens" prompt would not have produced the reusable platform that answers the evaluation.
- **Undifferentiated heavy lifting:** SSO, connectors, audit integrity, infra, monitoring, and compliance are integration/operational work. Devin accelerates coding, but it does not remove the ongoing **ownership** burden — which is the bulk of Retool's price.

---

## Recommendation

**Do not wholesale-replace Retool for these three tools today.** The prototype shows the reusable primitives are reproducible and that Devin makes per-tool cost very low — but for only three tools the fully-loaded cost of *owning* a production platform (≈7–14 engineer-weeks of build effort — and a ~3–6 month calendar dominated by review/integration/governance, compressible toward weeks only with full org commitment — plus ≈0.25–0.5 FTE/yr to run + on-call + security/compliance ownership + opportunity cost) plausibly **meets or exceeds** the $250k Retool spend, while adding risk. You'd be spending engineering to rebuild undifferentiated infrastructure Retool already operates and secures for you.

**Instead, take a staged / hybrid path:**

1. **Pilot in-house on net-new, integration-heavy tools** — build the *next* few internal tools on a platform like this prototype (where Devin's low marginal cost shines and Retool's connector limits or per-seat costs bite), while keeping the three existing tools on Retool.
2. **Measure the real numbers** over one quarter: actual maintenance hours, incident load, and how fast the internal-tool count grows.
3. **Revisit with data.** The build case gets strong when: (a) the internal-tool surface is heading toward *dozens* of tools (the platform amortizes and per-tool cost is ~hours), (b) you need deep integration with internal systems Retool handles poorly, or (c) Retool's cost scales worse than a mostly-fixed in-house maintenance cost. If none of those hold, **keep buying** — it's the cheaper, lower-risk option for a 3-tool footprint.

**Bottom line:** Devin can build the reusable platform — that part of the bet is real and demonstrated here. But "replace Retool" is mostly a decision about who **owns and operates** the platform long-term, not whether the code can be written. For three tools, keep Retool and pilot in-house; commit to build only once the tool count (or integration needs) makes owning the platform clearly cheaper than renting it.

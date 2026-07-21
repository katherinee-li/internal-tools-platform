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
- **All three required workflows + a fourth**, visibly built on the same platform.

## 2. What remains missing compared to Retool

Retool is far more than these primitives. Not attempted (and material):

- **Visual/low-code builder** — drag-and-drop app building; **non-engineers** can build and iterate. The prototype requires engineers writing TypeScript.
- **Managed connectors** — 100+ maintained integrations (Postgres, Stripe, Snowflake, REST/GraphQL, SaaS APIs) with auth handled. We used mock data.
- **Real identity** — SSO/SAML/OIDC, SCIM provisioning, sessions. We use a dev role selector.
- **Hosting & deployment** — cloud or self-hosted (Docker/K8s) in ~15 min; upgrades handled. We have none.
- **Governance at scale** — audit export/retention, environment promotion, granular permission groups, change management, protected resources, source control sync.
- **Operational surface** — monitoring, usage analytics, SLAs/support, security certifications (SOC 2, etc.), workflows/automation (cron), query library, modules, mobile.

## 3. Estimated engineering effort to reach production quality

Taking the prototype to a **production-grade platform for the current 3 tools** (not feature-parity with Retool). **Read the two right-hand columns separately** — "build effort" is how much *construction* work there is; "calendar" is how long it takes to actually ship in a regulated fintech, which is dominated by review/integration/approval latency, not typing.

| Area | Build effort (eng-weeks) | Calendar driver |
| --- | --- | --- |
| Real auth (SSO/OIDC), sessions, CSRF, SCIM | 2–4 | IdP/IT wiring + security sign-off (approval-bound) |
| Postgres + migrations + real connectors (Stripe, KYC vendor, flag store) | 3–6 | Vendor credentials/sandbox access + integration testing (external-party-bound) |
| Audit integrity (append-only/hash-chained, retention, SIEM export) | 1–2 | Compliance review |
| RBAC admin UI + fine-grained/record-level permissions + maker-checker | 2–4 | Access-model review |
| Deployment (VPC, TLS, CI/CD), monitoring, alerting, health checks | 2–4 | Infra procurement + fit to existing envelope |
| Hardening (rate limits, edge validation, secrets mgmt, pen-test fixes) | 2–3 | Pen-test scheduling + burn-in (elapsed-time-bound) |
| Accessibility, polish, docs, on-call runbooks | 1–2 | — |
| **Total build effort** | **~13–25 eng-weeks** | — |

**Effort vs. calendar — the distinction that matters most here:**

- **Build effort ≈ 3–6 engineer-months** of construction. Devin compresses the code-writing sharply (the reusable platform layer in this repo was built in ~20 minutes of Devin time), and with parallel subagents on independent tools/connectors the *coding* wall-clock can shrink to **~1–2 weeks**.
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

- **~2 hours**, ~2,100 LOC of TypeScript, the large majority generated by Devin. Includes the platform, 3 workflows, a 4th tool, an audit viewer, an 8-test adversarial suite, lint/typecheck/build gates, and docs. Evidence: this repo + engineering journal.

## 8. Approximate production development effort

- **Build effort ≈ 3–6 engineer-months** for a hardened v1 covering the current 3 tools (Section 3). The *coding* portion is Devin-compressed and subagent-parallelizable (down to ~1–2 weeks of wall-clock construction).
- **Calendar-to-production ≈ 3–6 months** under normal operations, dominated by security/compliance review, external-vendor/IdP integration, and elapsed-time gates — **not** code volume. A fully-committed org (instant reviews/approvals) plus subagents can compress this toward **~4–8 weeks**, but external-party, elapsed-time, and sequential floors keep it from reaching days (Section 3).
- **Ongoing ≈ 0.25–0.5 FTE** (Section 4) — unaffected by build speed; this is the recurring ownership cost.
- Feature-parity with Retool's builder/connectors/governance would be materially more and is not recommended to attempt.

## 9. Where Devin provided the greatest leverage

- Building the **reusable platform layer** and repetitive-but-exacting components (typed client, table/form/filter engine, seed data).
- **Marginal tool creation** — the 4th tool was near-instant once the pattern existed. This directly validates "the next tool is cheap."
- **Test generation** from explicit adversarial scenarios; quick, correct, and comprehensive.
- Overall: Devin is strongest exactly where Retool's *build-time* value lives (spinning up CRUD tools fast).

## 10. Where Devin was least effective

- **Not a code problem:** the decisions that mattered most — invest in an engine vs. three pages, RBAC model design, what to make a primitive, whether to parallelize — were human architectural judgment. A naive "build three screens" prompt would not have produced the reusable platform that answers the evaluation.
- **Undifferentiated heavy lifting:** SSO, connectors, audit integrity, infra, monitoring, and compliance are integration/operational work. Devin accelerates coding, but it does not remove the ongoing **ownership** burden — which is the bulk of Retool's price.

---

## Recommendation

**Do not wholesale-replace Retool for these three tools today.** The prototype shows the reusable primitives are reproducible and that Devin makes per-tool cost very low — but for only three tools the fully-loaded cost of *owning* a production platform (≈3–6 engineer-months of build effort — and a ~3–6 month calendar dominated by review/integration/governance, compressible toward weeks only with full org commitment — plus ≈0.25–0.5 FTE/yr to run + on-call + security/compliance ownership + opportunity cost) plausibly **meets or exceeds** the $250k Retool spend, while adding risk. You'd be spending engineering to rebuild undifferentiated infrastructure Retool already operates and secures for you.

**Instead, take a staged / hybrid path:**

1. **Pilot in-house on net-new, integration-heavy tools** — build the *next* few internal tools on a platform like this prototype (where Devin's low marginal cost shines and Retool's connector limits or per-seat costs bite), while keeping the three existing tools on Retool.
2. **Measure the real numbers** over one quarter: actual maintenance hours, incident load, and how fast the internal-tool count grows.
3. **Revisit with data.** The build case gets strong when: (a) the internal-tool surface is heading toward *dozens* of tools (the platform amortizes and per-tool cost is ~hours), (b) you need deep integration with internal systems Retool handles poorly, or (c) Retool's cost scales worse than a mostly-fixed in-house maintenance cost. If none of those hold, **keep buying** — it's the cheaper, lower-risk option for a 3-tool footprint.

**Bottom line:** Devin can build the reusable platform — that part of the bet is real and demonstrated here. But "replace Retool" is mostly a decision about who **owns and operates** the platform long-term, not whether the code can be written. For three tools, keep Retool and pilot in-house; commit to build only once the tool count (or integration needs) makes owning the platform clearly cheaper than renting it.

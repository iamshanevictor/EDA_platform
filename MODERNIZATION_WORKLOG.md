# EDA Platform Modernization Worklog

Last updated: 2026-08-04 (Asia/Manila)

## Purpose

This file is the persistent execution log for the EDA Platform modernization. It records product decisions, phase scope, verification results, completed commits, intentional behavior changes, deferred work, and the next approved step.

`CODEX_MODERNIZATION_CONTEXT.md` remains the project-wide modernization context. This worklog tracks the actual phased execution against the current repository.

## Working rules

- Work on one phase at a time.
- Do not begin a phase without explicit approval.
- Before editing, state the phase goal and files expected to change.
- Keep commits small, coherent, reversible, and independently reviewable.
- Run and record the relevant install, lint, type-check, test, and build commands after each commit.
- Do not use `--force` or `--legacy-peer-deps` as the final dependency solution.
- Do not weaken TypeScript or lint rules to hide failures.
- Do not perform destructive database changes without forward migration, data-migration, and rollback guidance.
- Preserve earlier phase history in this file; append results rather than replacing them.

## Current status

| Item | Status |
|---|---|
| Repository audit | Complete on 2026-08-03 |
| Application changes | Phase 1 framework/toolchain modernization complete locally |
| Current execution phase | Phase 1 implementation and verification complete; awaiting review/publication |
| Phase 0 preflight evidence | Substantially complete; usage totals and exact policy expressions/grants remain open. User reports no visible/configured Cron/Integrations or Storage buckets. |
| Next proposed phase | Phase 2 — anonymous isolation, retention, abuse protection, and permanent Groq removal, after explicit approval |
| Approval to implement Phase 0 | Approved and implemented on 2026-08-04 |
| Approval to implement Phase 1 | Approved and implemented on 2026-08-04 |
| Implementation branch | `phase-1-framework` |
| Worktree at decision capture | Clean `master` at `88d1a2e` |

## Audit baseline

The initial audit established the following baseline:

- Runtime used: Node.js `v24.12.0`, npm `11.6.2`.
- `npm ci` fails with `ERESOLVE` because `next@9.3.3` requires React `^16.6.0`, while React `19.2.0` is locked.
- Git history shows that the source previously resolved Next.js `15.5.4`; the Next.js 9 declaration is a recent dependency regression.
- `npm run lint` fails because the Next.js 9 CLI cannot run the declared `next lint` workflow.
- `npm run typecheck` and `npm test` do not exist.
- `npm run build` fails because Next.js 9 does not support `next.config.ts`.
- A direct TypeScript run reports 19 framework/API incompatibility errors.
- `npm audit` reports 92 vulnerabilities: 1 critical, 26 high, 55 moderate, and 10 low.
- No tests, CI workflow, database migrations, generated database types, or committed deployment configuration exist.

## Product decision log

| Decision | State | Recorded decision / recommendation |
|---|---|---|
| Product access model | Confirmed | Public anonymous demo with **session isolation**. Each visitor receives an anonymous Supabase identity and may access only their own uploads through RLS. Do not retain browse-all/read-all/write-all/delete-all anonymous access. |
| Authentication UX | Confirmed | No email, password, or PII required. Use Supabase anonymous sign-in behind the scenes. Require server-verified Cloudflare Turnstile and layered rate limits before public deployment. |
| Dataset retention | Confirmed | Uploaded datasets and derived analyses expire after 24 hours. Run cleanup hourly, so deletion occurs no later than approximately 25 hours after upload. Use cascading database deletion and include Storage cleanup if raw files move to Supabase Storage. |
| Existing Supabase data | Confirmed constraint | Preserve existing data while introducing migrations. Do not drop or rewrite existing tables without a reviewed migration and rollback plan. Existing rows may be brought under the 24-hour policy only after a one-time migration decision is recorded. |
| Groq / AI chatbot | Confirmed | Permanently remove Groq, the chatbot UI and server actions, `groq-sdk`, `GROQ_API_KEY`, AI-related documentation, and all transmission of dataset samples to an external model. |
| Deployment authority | Confirmed | Vercel production tracks Git branch `master` at `eda-platform.vercel.app`; the current successful deployment is commit `efba53f`. The user confirmed that Vercel's Supabase URL matches Supabase project `eda-platform`, branch `main`, which is marked production. |
| Browser baseline | Confirmed | Support modern evergreen browsers: Chrome/Edge 111+, Safari 16.4+, and Firefox 128+. Keep Tailwind 3.4 during framework recovery; consider Tailwind 4 only in a separate later commit. |
| PDF behavior | Confirmed | Pixel-identical output is not required. Prefer paginated, print-first HTML and browser Print to PDF so reports remain searchable, selectable, accessible, and memory-efficient. Remove html2canvas/jsPDF if manual browser PDF export satisfies the product need. |
| Abuse protection | Confirmed requirement | Protect free Vercel and Supabase capacity with server-verified Turnstile, anonymous identity, ownership RLS, explicit grants, database-backed quotas, bounded uploads/processing, Vercel bot/firewall controls, monitoring, and an upload kill switch. Do not rely on an in-memory serverless rate limiter or IP address alone. |

## Confirmed public-demo operating envelope

Use these conservative limits first. They can be raised only after profiling the modernized storage and analysis pipeline.

| Limit | Recommended initial value | Reason |
|---|---:|---|
| Raw CSV size | 2 MiB | Keeps anonymous abuse cost and parsed JSON expansion manageable. |
| Data rows | 10,000 | Suitable for a synchronous personal/demo EDA flow without pretending to support large data. |
| Columns | 100 | Prevents quadratic correlation work and unusable chart/report layouts. |
| Non-empty cells | 500,000 | Adds a shape limit that row/file limits alone do not provide. |
| Header length | 128 characters | Bounds metadata, prompts/tooltips, and database payloads. |
| Cell text length | 10,000 characters | Prevents single-cell memory and rendering abuse. |
| Synchronous parse/analysis target | 10 seconds typical, 20 seconds hard timeout | Provides a clear user-facing failure boundary for a public demo. |
| Concurrent upload/analysis per anonymous session | 1 | Prevents accidental or abusive parallel resource consumption. |
| Upload rate | 5 per hour per anonymous session, plus IP/platform protection | Conservative starting point; measure before increasing. |
| Stored datasets per anonymous session | 5 active datasets | Bounds database/storage use until 24-hour cleanup runs. |

Future expansion should move raw CSV files to Supabase Storage, store metadata/profiles separately, and process larger files through a bounded background job. Do not raise limits while complete datasets remain single JSONB rows fetched into memory.

## Confirmed infrastructure findings — 2026-08-04

The findings below are based on the supplied Vercel and Supabase dashboard screenshots. They are evidence for planning, not authorization to alter either cloud project.

- Vercel is connected to the GitHub repository `iamshanevictor/EDA_platform`.
- Vercel production tracks branch `master`, automatically assigns the production domain `eda-platform.vercel.app`, and currently points to the successful `efba53f` (`upt`) deployment created on 2025-10-07. Vercel labels it `Ready Stale`, and its deployment summary identifies Next.js `15.5.4`.
- More recent production builds for commits `822785d` and `88d1a2e` each failed after four seconds, so they did not replace `efba53f`. This independently supports restoring the source-aligned Next.js 15 baseline during Phase 0.
- Vercel has environment-variable entries scoped to all environments for `NEXT_PUBLIC_SUPABASE_URL`, a Supabase publishable/anon-key-looking name, and `GROQ_API_KEY`. Values remained concealed in the screenshot.
- Current source, deployed commit `efba53f`, and `.env.example` require `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`. A names-only inspection found that `.env.local` instead defines `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the Vercel screenshot also does not clearly show an exact match to the required name. Environment-variable names must match source exactly, so this is a confirmed local configuration defect and a probable Vercel configuration defect. No secret values were read or recorded.
- `GROQ_API_KEY` remains configured in Vercel and the live `efba53f` source contains Groq integration. Permanent removal from code, dependencies, documentation, and Vercel configuration is therefore a privacy release gate, not only dependency cleanup.
- Vercel's platform Firewall is active, but Bot Protection is inactive, AI bots are allowed, there are no custom rules, no blocked IPs, no bypasses, and Attack Mode is off. The sampled past-hour view showed 62 allowed requests and none denied, challenged, logged, or rate-limited; this sample is not evidence that the site is abuse-resistant.
- Supabase project `eda-platform`, branch `main`, is marked **PRODUCTION**.
- The public schema contains six visible tables: `datasets`, `dataset_analyses`, `categories`, `projects`, `submissions`, and `users`. Supabase estimates zero rows in every table.
- `dataset_analyses.dataset_id` references `datasets.id`. The visible `datasets` table has no ownership/session column, so a valid owner-only RLS policy cannot be assumed from the schema shown.
- RLS is disabled on all six public tables. Existing policies on `datasets` and `dataset_analyses` do not protect data while RLS is disabled.
- The policy dashboard explicitly states that each table can be accessed by anyone through the Data API while RLS is disabled. `dataset_analyses` has an `ALL` policy named `Allow all access for demo` applied to `anon`; `datasets` has `ALL` policies for `service_role` and `authenticated`. The other four tables show no policies. Exact `USING`/`WITH CHECK` expressions and grants must still be exported and reviewed before enabling RLS.
- The advisor also reports that public-schema objects are visible through the GraphQL schema. API grants and exposed schemas must be reviewed together with RLS.
- `categories`, `projects`, `submissions`, and the custom `users` table do not appear in the audited application source. Their ownership and purpose must be confirmed before any migration touches them. The custom `users.password_hash` column deserves special caution even though the current row estimate is zero.
- A follow-up search across the current repository and Git history found no database access for `categories`, `projects`, `submissions`, or the custom `users` table. Generic prose mentions the word “users,” but there is no application query targeting `public.users`. These four tables therefore appear unrelated or abandoned unless the owner recognizes an intended use outside the repository.
- The user confirmed that these four tables were manually created in Supabase or through development-time SQL and were never integrated into the web application. Classify them as unused legacy development tables: preserve them for now, exclude them from the EDA application's functional migration, and secure/revoke their public API exposure during Phase 2. Any later deletion requires separate explicit approval.
- Realtime is disabled for all six tables. This is appropriate unless a verified product need emerges.
- Supabase user signup is enabled, anonymous sign-in is disabled, manual linking is disabled, and email confirmation is enabled. The intended public-demo model will require anonymous sign-in and should not expose unused email/password signup after migration.
- Supabase CAPTCHA protection is disabled. Leaked-password protection is also disabled, but becomes irrelevant if password-based signup is removed as planned.
- The user reports no visible/configured Supabase Cron/Integrations or Storage buckets. Do not create them during preflight. Phase 2 will add the selected 24-hour cleanup scheduler through a reviewed, versioned migration or deployment configuration, and raw-file Storage remains optional.
- The user confirmed that Vercel's `NEXT_PUBLIC_SUPABASE_URL` points to this `eda-platform` Supabase project.
- The user reports having both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`. Current application code reads only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`; retain that as the canonical name and remove the unused alias only after Phase 0 verifies local and deployed configuration. No key values need to be disclosed or changed merely to normalize the names.

## Public-demo abuse protection model

No single rate limit is sufficient for a public anonymous service. Use layered controls, and fail closed when a required control is unavailable.

1. **Public-release gate and emergency response**
   - Do not treat the current Supabase configuration as safe for a public launch.
   - Protect preview deployments with Vercel's available deployment protection.
   - Use Vercel Attack Challenge Mode during an active attack, and retain a server-side upload kill switch that can disable new uploads without a code redeploy.
   - Do not merely enable RLS in the dashboard before reviewing and testing policies; incorrect active policies can either expose data or break the application.

2. **Edge and bot filtering**
   - Keep Vercel's built-in DDoS mitigation enabled and configure its available bot/firewall controls for suspicious paths and request patterns.
   - Do not depend on Vercel rate limiting alone because availability and billing vary by plan, and unrecognized bot traffic can still consume usage.
   - Use Cloudflare Turnstile's free plan without requiring the site to use Cloudflare as its CDN.

3. **Server-verified human challenge**
   - Require Turnstile for anonymous identity creation and each upload attempt.
   - Verify every token server-side with Siteverify and validate the hostname and expected action. A client widget without server verification provides no protection.
   - Reject missing, expired, duplicated, or invalid tokens before parsing or writing any dataset.

4. **Anonymous identity and row isolation**
   - Create a Supabase anonymous identity per browser session; anonymous users receive a real user ID and the `authenticated` database role.
   - Add immutable ownership to every dataset and derived analysis, and enforce `auth.uid()` ownership through tested RLS policies.
   - Revoke unnecessary table/function privileges and expose only the minimum API schema. Never place a service-role key in browser code.

5. **Distributed quotas**
   - Enforce the confirmed limits through an atomic database-backed quota/RPC mechanism keyed primarily by anonymous user ID and time window.
   - Use IP/network signals as an additional abuse signal, not the sole identity; NAT, IPv6 rotation, proxies, and botnets make IP-only enforcement unreliable.
   - Permit at most 5 upload attempts per hour, 1 concurrent analysis, and 5 active datasets per anonymous identity. Rejected and malformed attempts should count toward an abuse budget.
   - Never use process memory as the authoritative counter: separate serverless instances can bypass it.

6. **Validation before expensive work**
   - Reject unsupported methods, content types, encodings, and missing content lengths before reading the body where possible.
   - Stop reading as soon as the 2 MiB, 10,000-row, 100-column, 500,000-cell, header-length, or cell-length boundary is exceeded.
   - Validate row width, duplicate/empty headers, malformed quoting, formula-like export hazards, invalid text, and decompression/archive inputs. Initially accept CSV only, not ZIP files.
   - Apply origin checks and narrowly scoped CORS, but do not mistake either for authentication or bot protection.

7. **Bounded analysis and database cost**
   - Enforce a hard processing deadline and cancel database work after it expires; do not allow automatic retry loops to multiply load.
   - Cap correlation analysis to a separately documented number of numeric columns or use an explicit sample because pairwise correlation grows quadratically with column count.
   - Avoid repeatedly returning entire JSONB datasets. Large response amplification can exhaust Supabase egress before database storage is full.
   - Apply suitable statement timeouts and concurrency controls to upload/analysis functions.

8. **Retention and orphan cleanup**
   - Delete datasets and derived analyses hourly once they pass 24 hours, with transactional/cascading behavior and Storage cleanup if Storage is later introduced.
   - Remove orphaned anonymous Auth users after a short safety window following dataset deletion; the final interval must account for foreign keys and cleanup retries.
   - Monitor every scheduled cleanup run and alert on failures. Anonymous Auth users are not automatically removed by Supabase.

9. **Monitoring and capacity brakes**
   - Track Vercel request/function usage and Supabase database size, egress, Auth users, API traffic, slow queries, and cleanup backlog.
   - Alert at conservative usage thresholds such as 50%, 75%, and 90% of free allowances.
   - Fail closed for uploads when quota storage, Turnstile verification, or required security checks are unavailable. Read-only report access may degrade separately.

10. **Headers, secrets, logs, and output safety**
    - Add CSP, HSTS, `X-Content-Type-Options`, a restrictive referrer policy, and anti-framing rules appropriate to the deployed site.
    - Keep secrets server-only, rotate any exposed key, redact user/session identifiers, and never log raw datasets or full parsed rows.
    - Escape spreadsheet-formula-like cells in exports and safely render uploaded strings to prevent CSV/formula injection and stored/reflected script injection.

## Additional abuse and availability risk register

| Rank | Risk | Why it matters | Planned control |
|---:|---|---|---|
| Critical | RLS disabled on all public tables | Existing policy names provide no protection; public API grants may allow unauthorized reads or writes. | Review grants/policies, add ownership, enable and test RLS through versioned migrations before public release. |
| Critical | No visible dataset owner column | Session isolation cannot be enforced reliably without immutable ownership. | Add owner identity with a reviewed data migration and owner-based policies. |
| High | Shared/unknown tables in the production project | A migration aimed at this app could damage or expose another application's data. | Confirm table ownership; exclude unrelated objects or isolate this app in its own schema/project. |
| High | Custom `users.password_hash` table is public-schema and RLS-disabled | If it ever contains credentials, exposure has severe security impact. | Determine ownership immediately; do not use it for this anonymous demo; restrict or isolate it under its owning application. |
| High | Direct scripts bypass browser UI | Client-side file checks and a visible CAPTCHA alone do not stop automated requests. | Server-side Turnstile verification, RLS, atomic quotas, and boundary validation. |
| High | Serverless in-memory or IP-only rate limiting | Parallel instances, proxies, NAT, IPv6 rotation, and botnets bypass or unfairly trigger simple limits. | Database-backed per-identity quotas plus IP/network and bot signals. |
| High | JSONB and response amplification | Small uploads can expand in parsed form; repeated whole-dataset reads can exhaust 500 MB database or 5 GB egress allowances. | Cell/shape limits, bounded response projections, pagination/sampling, retention, usage alerts. |
| High | Cleanup or Cron failure | Data and anonymous users accumulate silently beyond the 24-hour promise. | Idempotent cleanup jobs, retry-safe design, run monitoring, backlog alarms, manual recovery procedure. |
| High | Quadratic statistical work | Wide files can trigger expensive correlation calculations despite a small byte size. | Numeric-column cap/sample, timeouts, concurrency limit, complexity tests. |
| Medium | Unrecognized bots still consume platform usage | DDoS mitigation does not guarantee that every scraper or low-rate bot is free to serve. | Managed bot rules, Turnstile, custom challenges, quota brakes, usage monitoring. |
| Medium | Sequential numeric IDs | IDs can make enumeration easier if an authorization defect exists. | RLS remains the primary control; use non-guessable public identifiers where useful. |
| Medium | Error/retry amplification | Automatic client/server retries can multiply load during partial outages. | Retry budgets, exponential backoff with jitter, idempotency, and failure-closed uploads. |
| Medium | Preview/admin surface exposure | Preview URLs, debug endpoints, source maps, or operational endpoints can bypass intended controls. | Protect previews, minimize endpoints, remove debug output, verify production environment separation. |

## How to identify the authoritative deployment

Vercel and Supabase are now the probable authoritative production services, but their linkage is not yet proven end to end. Before a deployment phase:

1. **Confirmed:** Vercel production branch, URL, deployed commit, framework version, Git project connection, and environment-variable names/scopes.
2. **Confirmed:** the user verified that Vercel's concealed `NEXT_PUBLIC_SUPABASE_URL` hostname matches Supabase project `eda-platform`; no value was disclosed.
3. **Partially confirmed:** Vercel Firewall/Bot state is captured; full project usage totals and plan allowance meters remain open.
4. **Partially confirmed:** the four non-EDA tables are unused legacy development tables and will not be deleted or functionally migrated. Exact policy expressions and grants for all six tables remain to be exported before the Phase 2 RLS migration.
5. **Partially confirmed:** Auth anonymous-sign-in and Bot/Abuse Protection state is captured. The user reports no visible/configured Cron/Integrations or Storage buckets; API-exposed schemas and any database-scheduled jobs remain to be verified during the migration preflight.
6. Record only project references, deployment URLs, schema/policy summaries, and non-secret configuration names here; never record API keys, JWT secrets, passwords, or connection strings.

## Phase plan and history

### Phase 0 — Baseline and safety net

Status: **Complete; implemented, locally verified, and published**

Goal: recover a reproducible source-aligned baseline and add quality gates without changing product behavior, statistics, database security, persistence, or UI.

Phase 0 preflight evidence to capture, without changing cloud state:

- Confirm the Vercel production branch, URL, deployment SHA, environment-variable names/scopes, Firewall state, and usage state.
- Export the Supabase policies/grants and confirm the purpose/owner of all six public tables.
- Confirm Auth anonymous-sign-in, Bot/Abuse Protection, Cron, API schema, and Storage settings.
- Treat the public deployment as blocked until Phase 2 security gates pass. If an active attack occurs before then, use the documented emergency containment controls rather than waiting for modernization.

Completed reviewable commits:

1. `e9bb454 fix(deps): restore secure Next 15 baseline`
   - Replaced the impossible Next 9/React 19 combination with source-compatible Next `15.5.21`, the current Maintenance LTS security patch line.
   - Aligned `eslint-config-next` at `15.5.21`, pinned React/React DOM `19.2.0`, and replaced floating `@supabase/ssr: latest` with installed `0.7.0`.
   - Restored a reproducible lockfile and clean `npm ci` without force flags.

2. `b300ebe chore(toolchain): standardize Node and quality scripts`
   - Declared Node `24.x`, npm `11.x`, `npm@11.6.2`, and `.nvmrc` `24.12.0`.
   - Replaced deprecated `next lint` with strict ESLint CLI and added `typecheck`.
   - Added compatibility for the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` alias while keeping `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` canonical; no values were changed or exposed.
   - Converted the Tailwind plugin import to ESM so source lint passes without weakening rules.

3. `73bd039 test(analysis): characterize current statistical behavior`
   - Added Vitest `4.1.10` and a deterministic `npm test` script.
   - Extracted the existing in-memory algorithm to `lib/analysis/analyzeDataset.ts`; database I/O remains in the server action.
   - Added six characterization tests without correcting formulas.
   - Newly confirmed that native booleans are classified as numeric because numeric coercion precedes the Boolean branch.

4. `8f450c9 ci: add baseline quality workflow`
   - Added least-privilege GitHub Actions for clean install, lint, type-check, tests, and build on Node 24.
   - Uses non-secret placeholder Supabase configuration for build-only prerendering.
   - The workflow has not run remotely because the branch has not been pushed.

Required Phase 0 verification:

```text
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

Phase 0 completion gate:

- [x] Clean installation succeeds without force flags.
- [x] Lint, type-check, tests, and production build pass locally.
- [x] Six characterization tests protect current analysis behavior.
- [ ] GitHub Actions reproduces the same result remotely. The branch was published, but the workflow is configured for pull requests and pushes to `master`, so a standalone branch push did not trigger it. Vercel's commit status succeeded.
- [x] This worklog records every Phase 0 commit, command result, deviation, and remaining risk.

Final local verification on Node `v24.12.0`, npm `11.6.2`:

| Command | Exact result |
|---|---|
| `npm ci` | Exit `0`; 565 packages installed and 566 audited in 46 seconds; 3 high-severity advisories; no force flags. |
| `npm run lint` | Exit `0`; ESLint CLI reported no warnings or errors. |
| `npm run typecheck` | Exit `0`; TypeScript emitted no errors. |
| `npm test` | Exit `0`; 1 file passed, 6 tests passed, duration 1.82 seconds. Local sandbox execution required permission for Vitest worker-process spawning. |
| `npm run build` | Exit `0`; Next `15.5.21` compiled, type-checked, and generated 9 routes in 36.7 seconds using CI-equivalent placeholder configuration. The configured Google-hosted Geist font requires network access during a clean build. |
| `npm audit` | Exit `1`; 3 high-severity advisories remain in Next's transitive `postcss@8.4.31` and `sharp@0.34.5`. npm's forced proposal would downgrade to incompatible Next `9.3.3`, so it was rejected. |

Measured build concern: shared first-load JavaScript is 649 kB, including a 647 kB `vendors` chunk created by the custom Webpack split configuration. Phase 1 will remove/reassess that configuration before performance work.

### Phase 1 — Supported framework/toolchain

Status: **Implemented and verified locally; awaiting review/publication**

Completed reviewable commits:

1. `d4a94bc chore(framework): upgrade to Next 16.2 LTS`
   - Upgraded Next and `eslint-config-next` to `16.2.11`, React/React DOM to `19.2.8`, and aligned React type packages.
   - Replaced the compatibility-based ESLint configuration with Next 16's native flat configuration and removed `@eslint/eslintrc`.
   - Accepted Next 16's required TypeScript JSX transform and generated development-type include.
   - Replaced two synchronous effect-state patterns exposed by the newer React hooks lint rules without disabling rules or changing visible behavior.

2. `dc1e475 refactor(framework): adopt Next 16 runtime conventions`
   - Renamed the root request boundary from `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()` while preserving its matcher and Supabase session-refresh behavior.
   - Removed the obsolete custom Webpack split-chunk override and redundant experimental package-import configuration.
   - Removed the explicit `--turbopack` development flag because Turbopack is the Next 16 default.

Final local verification on Node `v24.12.0`, npm `11.6.2`:

| Command | Exact result |
|---|---|
| `npm ci` | Exit `0`; 593 packages installed and 594 audited in 72 seconds; 3 high-severity advisories; no force flags. |
| `npm run lint` | Exit `0`; ESLint CLI reported no warnings or errors. |
| `npm run typecheck` | Exit `0`; TypeScript emitted no errors. |
| `npm test` | Exit `0`; 1 file passed and all 6 tests passed. Windows sandbox execution required permission for Vitest worker-process spawning. |
| `npm run build` | Exit `0`; Next `16.2.11` used Turbopack, compiled in 9.1 seconds, type-checked, and generated all 8 static/dynamic routes plus the proxy boundary. Build used non-secret placeholder configuration. |
| `npm audit --omit=dev` | Exit `1`; 3 high-severity advisories remain in Next's bundled `postcss` and `sharp`. npm's forced proposal would downgrade to incompatible Next `9.3.3`, so it was rejected. |

Phase 1 completion gate:

- [x] Supported Next 16/React 19 compatibility group installed reproducibly.
- [x] Native flat ESLint configuration passes with zero warnings.
- [x] Root middleware migrated to the supported proxy convention.
- [x] Custom Webpack override removed and production Turbopack build passes.
- [x] Product UI, statistics, database behavior, and cloud configuration remain intentionally unchanged.
- [ ] Remote CI will run when a pull request is opened or this branch is pushed/merged to `master`.

### Phase 2 — Anonymous isolation, retention, and abuse protection

Status: **Awaiting Phase 1 review and explicit approval**

Planned scope includes permanent Groq/chatbot removal from code, dependencies, documentation, and Vercel configuration; anonymous Supabase identities; immutable dataset ownership; ownership-based RLS and minimum grants; server-verified Turnstile; atomic database-backed quotas; confirmed upload/analysis limits; 24-hour cleanup migrations and monitored Cron; operational kill switches; and security tests. This phase is a privacy/security public-release gate.

### Phase 3 — Dependency modernization and intentional removals

Status: **Blocked on earlier phases**

Planned scope includes compatible Supabase packages, UI/chart packages, and removal of remaining unused dependencies. Tailwind 4 and PDF-library removal remain separate reviewable changes.

### Phase 4 — Statistical correctness and validation

Status: **Blocked on earlier phases**

Planned scope includes row-aligned correlation, documented quantiles/standard deviation, robust type inference, bounded CSV validation, deterministic sampling, correct total-versus-sample calculations, and a reviewed Storage/background-processing design.

### Phase 5 — Performance, UX, and reporting

Status: **Blocked on earlier phases**

Planned scope includes eliminating whole-JSONB pagination, bounded processing, accessible states, and the approved print-first reporting design.

### Phase 6 — Documentation and release

Status: **Blocked on earlier phases**

Planned scope includes verified setup, architecture, environment classification, limits, retention/security documentation, deployment/rollback guidance, and a release checklist.

## Official operational references

- Supabase anonymous sign-ins and cleanup: <https://supabase.com/docs/guides/auth/auth-anonymous>
- Supabase Auth rate limits: <https://supabase.com/docs/guides/auth/rate-limits>
- Supabase CAPTCHA configuration: <https://supabase.com/docs/guides/auth/auth-captcha>
- Supabase API grants and RLS: <https://supabase.com/docs/guides/api/securing-your-api>
- Supabase Cron: <https://supabase.com/docs/guides/cron>
- Supabase database timeouts: <https://supabase.com/docs/guides/database/postgres/timeouts>
- Supabase Free database size: <https://supabase.com/docs/guides/platform/database-size>
- Supabase quotas and billing metrics: <https://supabase.com/docs/guides/platform/billing-on-supabase>
- Vercel DDoS mitigation and Attack Challenge Mode: <https://vercel.com/docs/vercel-firewall/ddos-mitigation>
- Vercel WAF usage and pricing: <https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing>
- Vercel Bot Management: <https://vercel.com/docs/bot-management>
- Vercel Hobby limits: <https://vercel.com/docs/plans/hobby>
- Cloudflare Turnstile plans: <https://developers.cloudflare.com/turnstile/plans/>
- Cloudflare Turnstile server-side validation: <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>

## Phase change log

Append entries using this structure:

```text
### YYYY-MM-DD — Phase N / commit or checkpoint

- Goal:
- Files changed:
- Behavior changed:
- Commands and exact results:
- Security/data impact:
- Decisions made:
- Deferred risks:
- Next approved step:
```

### 2026-08-04 — Pre-implementation decision capture

- Goal: record audit conclusions, user decisions, recommendations, and Phase 0 scope without changing the application.
- Files changed: `MODERNIZATION_WORKLOG.md` only.
- Behavior changed: none.
- Security/data impact: none.
- Decisions made: 24-hour retention; permanent Groq removal; public anonymous product direction.
- Recommendations pending confirmation: session-isolated anonymous identities; conservative operating envelope; modern browser baseline; print-first PDF design.
- Deferred risks: live deployment, live schema, RLS, existing data, and scheduled jobs remain unverified.
- Next approved step: Phase 0, commit 1 — restore the source-aligned Next 15 baseline.

### 2026-08-04 — Infrastructure evidence and abuse-protection checkpoint

- Goal: record confirmed product choices and dashboard evidence, then define a free-tier-conscious abuse model without changing application or cloud state.
- Files changed: `MODERNIZATION_WORKLOG.md` only.
- Behavior changed: none.
- Security/data impact: none; no Vercel or Supabase settings were changed.
- Decisions made: session-isolated anonymous demo, confirmed operating envelope, modern browser baseline, print-first PDF, 24-hour retention, and layered rate limiting/bot protection.
- Evidence recorded: Vercel Git connection; Supabase production project/table layout; zero estimated rows; all six public tables have RLS disabled; inactive policies and GraphQL exposure warnings.
- Plan changed: anonymous isolation, retention, and abuse protection moved from Phase 4 to Phase 2 and became a public-release gate.
- Deferred risks: exact Vercel production deployment and environment linkage, policy SQL/grants, table ownership, Auth/CAPTCHA/Cron/Storage settings, and firewall/usage state remain unverified.
- Next approved step: Phase 0 preflight evidence capture and commit 1 — restore the source-aligned Next 15 baseline. No implementation begins without explicit approval.

### 2026-08-04 — Production configuration checkpoint

- Goal: verify the active Vercel deployment, environment-variable names, firewall/bot state, and Supabase Auth/policy state without changing either service.
- Files changed: `MODERNIZATION_WORKLOG.md` only.
- Behavior changed: none.
- Security/data impact: none; screenshots were inspected read-only and secret values remained concealed.
- Evidence recorded: Vercel tracks `master` at `eda-platform.vercel.app`; `efba53f` is the current successful production deployment using Next.js 15.5.4; builds `822785d` and `88d1a2e` failed; Bot Protection and Attack Mode are off; Supabase anonymous sign-in and CAPTCHA are off; RLS remains disabled and the Data API warning is explicit.
- Configuration risk: a names-only check confirms that `.env.local` defines `NEXT_PUBLIC_SUPABASE_ANON_KEY`, while source, `.env.example`, and deployed commit `efba53f` require `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`. The Vercel screenshot also does not clearly show an exact match. Reconcile names in Phase 0 without exposing or replacing key values unnecessarily.
- Plan changed: permanent Groq removal moved into the Phase 2 privacy/security public-release gate because the live deployment still contains the integration and Vercel still holds `GROQ_API_KEY`.
- Deferred risks: Supabase URL/project match, exact policy expressions and grants, ownership of four unrelated-looking tables, Cron, Storage, API schemas, scheduled jobs, and full free-plan usage totals remain unverified.
- Next approved step: finish the remaining read-only Phase 0 preflight evidence, then begin Phase 0 commit 1 only after explicit approval.

### 2026-08-04 — Configuration clarification checkpoint

- Goal: explain table ownership and environment linkage, then verify repository use and local environment-variable names without reading secret values.
- Files changed: `MODERNIZATION_WORKLOG.md` only.
- Behavior changed: none.
- Security/data impact: none; only environment-variable names were listed.
- Evidence recorded: no repository or Git-history database access targets `categories`, `projects`, `submissions`, or custom `public.users`; `.env.local` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`, but application source requires `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`.
- User-reported state: no visible/configured Supabase Cron/Integrations or Storage buckets.
- Decision needed: whether the four unused tables originated from another project/experiment or can be treated as abandoned. Do not delete them based only on zero estimated rows.
- Deferred risks: exact RLS policy expressions/grants, Supabase URL/project match, API-exposed schemas, and Vercel usage totals.
- Next approved step: continue read-only clarification or explicitly approve Phase 0; no implementation has started.

### 2026-08-04 — Deployment and legacy-table decisions resolved

- Goal: record the user's answers to the remaining deployment-linkage, table-ownership, and environment-name questions.
- Files changed: `MODERNIZATION_WORKLOG.md` only.
- Behavior changed: none.
- Security/data impact: none; no values or settings were changed.
- Decision resolved: `categories`, `projects`, `submissions`, and custom `users` were manually created during development and never integrated into the web application. Preserve them as unused legacy development tables, exclude them from EDA functionality, and secure their API exposure in Phase 2. Deletion is not authorized.
- Deployment linkage resolved: the user confirmed that Vercel's Supabase URL matches project `eda-platform` without disclosing the URL.
- Environment clarification: both Supabase key variable aliases reportedly exist. Current source reads only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`; it becomes the canonical name after Phase 0 verification, and the unused alias can then be removed without changing or disclosing key values.
- Deferred risks: exact RLS policy expressions/grants, API-exposed schemas, and Vercel usage totals.
- Next approved step: explicitly approve Phase 0 when ready; no implementation has started.

### 2026-08-04 — Phase 0 implemented and locally verified

- Goal: recover a reproducible source-compatible baseline, establish quality commands, characterize current statistical behavior, and add CI without changing product formulas, UI, persistence, or cloud configuration.
- Branch: `phase-0-baseline`.
- Commits: `e9bb454`, `b300ebe`, `73bd039`, and `8f450c9`.
- Files changed: `.nvmrc`, `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `eslint.config.mjs`, `tailwind.config.ts`, Supabase client/config compatibility files, `app/actions/analyzeData.ts`, and new pure-analysis/test files under `lib/analysis/`.
- Behavior changed: framework installation and developer commands now work; either documented Supabase key alias is accepted. Statistical output intentionally remains unchanged.
- Commands and exact results: Node `v24.12.0`; npm `11.6.2`; `npm ci` passed; lint passed; type-check passed; 6/6 tests passed; production build passed; `npm audit` reports 3 high-severity transitive advisories.
- Security/data impact: no database, RLS, Vercel, Supabase, production deployment, or user data was changed. The local branch uses Next `15.5.21`; live Vercel production remains on older commit `efba53f` with Next `15.5.4`.
- Decisions made: use current Maintenance LTS Next 15 patch for baseline recovery instead of recreating vulnerable 15.5.4; use Vitest 4.1.10; keep Node 24/npm 11 canonical; reject `npm audit fix --force` because it proposes incompatible Next 9.3.3.
- Newly confirmed correctness risk: native booleans are classified as numeric before the Boolean branch; row-misaligned correlation, index quartiles, population deviation, first-value inference, and broad date parsing are now covered by characterization tests.
- Deferred risks: 3 high-severity Next transitive advisories; 649 kB shared first-load JavaScript; network-dependent Google font build; remote CI not yet run; RLS/abuse/privacy work remains gated for Phase 2; live production remains unchanged and should not be considered modernized.
- Next approved step: review Phase 0 and decide whether to publish the branch for remote CI. Do not begin Phase 1 without explicit approval.

### 2026-08-04 — Phase 1 implemented and locally verified

- Goal: move the recovered baseline to the supported Next 16/React 19 compatibility group and adopt current framework conventions without changing product behavior.
- Branch: `phase-1-framework`.
- Commits: `d4a94bc` and `dc1e475`.
- Files changed: framework and lint manifests/configuration, TypeScript configuration, two React components, `next.config.ts`, and the root `middleware.ts` to `proxy.ts` rename.
- Behavior changed: developer and production builds now use Next 16's default Turbopack path; the request matcher and session refresh behavior are preserved. No intentional user-facing behavior changed.
- Commands and exact results: clean `npm ci` passed; lint passed; type-check passed; 6/6 characterization tests passed; Next `16.2.11` production build passed and emitted 8 routes plus the proxy boundary.
- Security/data impact: no Supabase schema, RLS policy, stored data, Vercel setting, environment value, or production deployment was changed. Three high-severity transitive advisories remain and npm's unsafe forced downgrade was rejected.
- Decisions made: keep Node 24/npm 11; use native ESLint flat configuration; accept Next's `react-jsx` TypeScript migration; remove custom Webpack chunking and redundant import optimization; retain the internal `lib/supabase/middleware.ts` helper because only the root Next convention was renamed.
- Deferred risks: permanent Groq/chatbot removal, anonymous identity and RLS isolation, quotas/Turnstile, 24-hour cleanup, security headers, statistical corrections, and broader dependency updates remain in later approved phases.
- Next approved step: review and publish Phase 1. Do not begin Phase 2 without explicit approval because it includes privacy/security behavior, database migrations, and Groq removal.

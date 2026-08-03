# Codex Modernization Context — EDA Platform

## Purpose

Use this document as the persistent context and operating instructions for modernizing this repository.

Repository: `iamshanevictor/EDA_platform`
Default branch: `master`
Application: Web-based exploratory data analysis platform for uploaded CSV datasets.

The project has been inactive for several months and needs a careful dependency, architecture, security, correctness, testing, and developer-experience refresh.

Do **not** treat this as a simple “upgrade all packages to latest” task. First understand the application, establish a working baseline, identify incompatibilities, then modernize it in small reviewable phases.

---

## Current Product Intent

The application is intended to let users:

1. Upload CSV files.
2. Store dataset content and metadata in Supabase/PostgreSQL.
3. Compute exploratory analysis, including column types, missing values, summary statistics, and correlations.
4. Display charts and analysis results.
5. Ask dataset-related questions through a Groq-powered chatbot.
6. Generate printable or PDF reports.

Preserve these product capabilities unless a change is explicitly justified in the migration plan.

---

## Current Documented Stack

The README describes:

- Next.js App Router
- React and TypeScript
- Tailwind CSS and shadcn/Radix UI
- Supabase/PostgreSQL
- Recharts
- Papa Parse
- Groq SDK
- jsPDF/html2canvas/react-to-print

Important: documentation and installed dependencies are currently inconsistent.

### Known dependency inconsistency

At the time this context file was created, `package.json` contains a particularly unsafe combination:

- `next: ^9.3.3`
- `react: ^19.0.0`
- `react-dom: ^19.0.0`
- `eslint-config-next: 15.3.1`
- a `next dev --turbopack` script
- App Router-style source code and server actions

Next.js 9 does not match the source architecture, React version, ESLint configuration, or Turbopack script. Determine what version is actually installed in the lockfile and whether the project currently installs/builds before editing versions.

Also note that `@supabase/ssr` is declared as `latest`. Replace floating versions with intentional compatible version ranges after the audit.

---

## Known Areas Requiring Investigation

These are initial observations, not a complete audit.

### 1. Build and dependency health

- Reproduce installation with the existing lockfile.
- Record the Node.js and npm versions used.
- Run lint, TypeScript checking, tests if any, and production build.
- Identify peer-dependency conflicts and deprecated APIs.
- Check whether `next lint` is valid for the selected Next.js version.
- Avoid combining framework upgrades with unrelated refactors in one step.

### 2. Database security

The README currently suggests anonymous `FOR ALL` access policies for both `datasets` and `dataset_analyses`.

Treat that only as an insecure demo configuration. Review:

- whether anonymous users can read, insert, update, or delete every row;
- whether authentication and per-user ownership should be added;
- service-role versus anon-key usage;
- server-only environment variables;
- validation and authorization in server actions;
- upload size and resource-consumption limits;
- data retention and deletion behavior.

Never expose a Supabase service-role key to the browser.

### 3. Data model and scalability

The current schema stores complete parsed CSV data in a JSONB field. Assess:

- practical row/file-size limits;
- request-body and server-action limits;
- Supabase/Postgres row-size and query costs;
- whether raw files should move to Supabase Storage;
- whether previews, profiles, and derived analysis should be stored separately;
- background/queued analysis for large datasets;
- pagination and streaming instead of loading an entire dataset into memory.

Do not redesign persistence until current behavior and migration needs are documented.

### 4. Statistical correctness

Review `app/actions/analyzeData.ts` carefully.

Known concerns include:

- type detection based heavily on the first non-empty value;
- broad date parsing that may classify ordinary strings as dates;
- Boolean coercion where non-empty strings such as `"false"` become `true`;
- quartile calculation using simple array indexes rather than a documented quantile method;
- population versus sample standard deviation not being stated;
- use of `Math.min(...largeArray)` and `Math.max(...largeArray)`, which can fail or consume excessive memory for large arrays;
- correlation vectors being filtered independently, which can pair values from different original rows when either column contains missing/non-numeric data;
- correlation matrix entries initialized for non-numeric columns even though they are not meaningfully computed.

Add deterministic tests for analysis logic before changing formulas. Document the chosen statistical definitions.

### 5. AI/chat behavior and privacy

Review `app/actions/chatbot.ts` and related UI.

- Confirm the currently supported Groq model rather than assuming the hard-coded model remains available.
- Add input length, error, timeout, and rate-limit handling.
- Clearly disclose which dataset content is sent to the model.
- Minimize transmitted sample data and avoid sensitive columns where possible.
- Ensure the model cannot directly issue arbitrary database queries.
- Separate natural-language responses from deterministic data calculations.
- Review missing-value percentage calculations; sample length must not be mistaken for total dataset row count.
- Make model/provider configuration environment-driven where appropriate.

### 6. Validation and error handling

- Validate CSV type, encoding, headers, duplicate columns, row width, file size, row count, and malformed input.
- Use schema validation at server boundaries.
- Return typed, user-safe errors and log internal details separately.
- Review every server action for authorization, validation, and accidental sensitive-data exposure.

### 7. Testing and CI

The modernization should introduce or repair:

- unit tests for statistical helpers and parsing;
- integration tests for Supabase-facing repository/service functions;
- at least one end-to-end happy path for upload → analysis → visualization;
- tests for malformed and oversized CSV files;
- lint, type-check, test, and build scripts;
- a GitHub Actions workflow using a supported Node.js LTS release;
- dependency update automation only after the baseline is stable.

Prefer tests around extracted pure functions instead of testing all logic through server actions.

### 8. Documentation and operations

Update the README only after the implementation is verified. Documentation should include:

- exact supported Node.js version;
- one canonical package manager;
- reproducible setup commands;
- environment variable table with public/server-only classification;
- Supabase migrations rather than copy-pasted ad hoc SQL where feasible;
- secure local/demo and production RLS guidance;
- current architecture and data flow;
- known limits for file size and row count;
- deployment and rollback notes.

Remove placeholder repository links and unverified performance claims.

---

## Modernization Principles

1. **Inspect before editing.** Read the repository structure, source files, configs, lockfile, and git history.
2. **Reproduce before upgrading.** Establish whether the current commit installs and builds.
3. **Prefer supported stable releases.** Do not select versions only because they are newest.
4. **Check official migration guides.** Pay special attention to Next.js, React, ESLint, Tailwind, Supabase, Recharts, Groq SDK, and PDF libraries.
5. **Make small, reversible changes.** Keep dependency/framework migration separate from behavior changes where possible.
6. **Preserve product behavior.** Call out intentional breaking changes before implementing them.
7. **Add tests around risky logic first.** Especially statistical calculations, CSV parsing, database access, and uploads.
8. **Do not hide failures.** Do not weaken TypeScript, disable ESLint rules broadly, add blanket `any`, or use `--force`/`--legacy-peer-deps` as the final solution.
9. **Protect user data.** Secure defaults take priority over preserving an insecure demo policy.
10. **Keep a decision log.** Explain version choices, deferred work, tradeoffs, and migrations.

---

## Required Initial Audit

Before modifying application code, produce a concise audit containing:

### Repository map

- major routes and pages;
- server actions and API routes;
- components and charting modules;
- Supabase clients and middleware;
- upload, parsing, storage, analysis, chat, and report-generation flow;
- configuration, scripts, and deployment files.

### Baseline commands and results

Run the repository's applicable commands and record exact results:

```bash
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Some scripts may not exist. Report that fact and propose the correct scripts; do not pretend they ran.

### Dependency audit

For every direct dependency, classify it as:

- keep;
- upgrade;
- replace;
- remove;
- investigate.

Include current declared version, installed version, proposed target, compatibility constraints, and migration notes. Use official documentation/changelogs for claims about current APIs.

### Risk register

Rank findings by severity:

- Critical: security exposure, data loss, impossible build/runtime combination.
- High: incorrect analysis, broken primary flow, unsupported framework.
- Medium: maintainability, performance limitations, incomplete validation.
- Low: cleanup, style, documentation drift.

---

## Recommended Delivery Phases

Adjust these phases after the audit, but keep changes independently reviewable.

### Phase 0 — Baseline and safety net

- Create a modernization branch.
- Record environment and baseline failures.
- Add missing scripts without changing runtime behavior.
- Add focused tests for current analysis behavior.
- Add CI that initially reflects the real baseline.

### Phase 1 — Resolve framework/toolchain inconsistency

- Choose a supported Node.js LTS version.
- Align Next.js, React, React DOM, TypeScript, ESLint, and `eslint-config-next`.
- Follow official framework migrations.
- Update scripts and config.
- Restore clean install, type-check, lint, and production build.

### Phase 2 — Dependency modernization

- Upgrade remaining libraries in compatible groups.
- Pin intentional ranges; remove `latest` declarations.
- Remove unused dependencies.
- Verify charts, CSV parsing, themes, Supabase, AI, and report generation after each group.

### Phase 3 — Correctness and validation

- Extract statistical logic into pure tested modules.
- Fix paired-row correlation handling and document formulas.
- Improve robust column inference.
- Add CSV and server-boundary validation.
- Correct dataset row-count versus sample-row logic.

### Phase 4 — Security and data architecture

- Replace public write-all RLS with an explicit security model.
- Add ownership/authentication if product requirements support it.
- Add upload and processing limits.
- Decide whether raw files belong in Supabase Storage.
- Create versioned database migrations and data migration/rollback steps.

### Phase 5 — UX, performance, and maintainability

- Improve loading/error/empty states and accessibility.
- Avoid loading entire large datasets where unnecessary.
- Introduce pagination, sampling, workers, or background jobs based on measured needs.
- Reduce oversized components and duplicate types.

### Phase 6 — Documentation and release

- Update README and environment examples.
- Document architecture, limits, security model, and operational procedures.
- Produce a release checklist and rollback plan.
- Summarize all intentional behavior changes.

---

## Definition of Done

A modernization phase is complete only when:

- a clean checkout installs reproducibly with the documented package manager;
- TypeScript passes without broad suppressions;
- lint passes without disabling core rules to conceal problems;
- tests pass;
- a production build succeeds;
- major user flows are manually or automatically verified;
- security-sensitive changes are documented;
- database changes include forward and rollback/migration guidance;
- README/setup instructions match the repository;
- the final summary lists changed files, commands run, results, remaining risks, and follow-up work.

---

## Codex Working Prompt

Copy the prompt below into Codex from the repository root.

```text
You are the lead engineer responsible for safely modernizing this repository.

First read CODEX_MODERNIZATION_CONTEXT.md in full, then inspect the entire repository before making changes. Treat that file as persistent project context, but verify every observation against the current code and official documentation.

Goal:
Modernize the EDA Platform's dependencies, framework/toolchain, architecture, security, correctness, tests, CI, and documentation while preserving its core product behavior: CSV upload, Supabase persistence, exploratory analysis, visualizations, dataset chat, and report export.

Important constraints:
- Do not blindly update every dependency to latest.
- Do not use npm --force or --legacy-peer-deps as the final fix.
- Do not weaken TypeScript, broadly disable lint rules, or introduce blanket any types to make checks pass.
- Do not make database-destructive changes without a migration and rollback plan.
- Do not preserve insecure anonymous write-all database access merely for backward compatibility.
- Do not mix a large framework upgrade, database redesign, statistical behavior changes, and UI redesign into one unreviewable change.
- Use official migration guides and current primary documentation when selecting target versions or changing APIs.

Start with an audit only. Do not edit files in the first step.

The audit must include:
1. A map of the actual repository structure and runtime data flow.
2. Current Node/package-manager assumptions and lockfile state.
3. Exact results from install, lint, type-check, test, and build commands. State clearly when a command or script is missing.
4. A direct-dependency table: declared version, installed version, purpose, status (keep/upgrade/replace/remove/investigate), proposed compatible target, and migration risk.
5. A ranked risk register covering build compatibility, security, data privacy, statistical correctness, scalability, and maintainability.
6. A phased implementation plan with small reviewable commits and verification commands for each phase.
7. Questions that genuinely require a product decision; make reasonable technical decisions yourself when they do not require product input.

Pay special attention to:
- the mismatch between the Next.js declaration, React 19, App Router/server actions, Turbopack script, and eslint-config-next;
- floating dependency versions such as @supabase/ssr: latest;
- Supabase RLS and anonymous database permissions;
- storage of complete CSV contents in JSONB;
- upload/file/row limits and server-side validation;
- statistical correctness in app/actions/analyzeData.ts, especially row-aligned correlation pairs, type inference, Boolean/date parsing, quartiles, standard deviation, and large-array operations;
- privacy and deterministic calculation boundaries in app/actions/chatbot.ts;
- the difference between dataset total row count and the small sample passed to the chatbot;
- missing or incomplete tests and CI;
- README claims that may not match verified behavior.

After presenting the audit, stop and wait for approval of the phased plan before implementing changes.

For every later implementation phase:
- state the phase goal;
- list files to change before editing;
- make the smallest coherent changes;
- run the relevant verification commands;
- report exact results and remaining risks;
- keep documentation synchronized;
- create clear conventional commits when asked to commit.
```

---

## Product Decisions to Clarify Later

The audit can proceed without answers, but implementation may need decisions on:

- Is this a public anonymous demo, a multi-user authenticated product, or both?
- Should uploaded data persist permanently, expire automatically, or remain local-only by default?
- What maximum file size and row count must be supported?
- Can dataset samples be sent to an external AI provider, and what consent/redaction is required?
- Must existing Supabase data be preserved through schema changes?
- Which deployment environment is authoritative (for example, Vercel plus Supabase)?
- Is PDF generation required to be pixel-identical, or can the reporting implementation change?

Until these are answered, choose conservative, secure, reversible defaults and clearly label assumptions.

# EDA Platform

A public anonymous demo for bounded exploratory analysis of CSV files. Each
browser receives a temporary Supabase anonymous identity after passing
Cloudflare Turnstile. Datasets are isolated by Row Level Security (RLS), become
inaccessible after 24 hours, and are physically deleted by an hourly cleanup
job.

The application does not include an AI chatbot and does not send dataset
content to an external AI provider.

## Supported stack

- Node.js 24.x and npm 11.x
- Next.js 16.2 and React 19.2
- TypeScript and Tailwind CSS 3.4
- Supabase Auth and PostgreSQL
- Papa Parse and Recharts
- Cloudflare Turnstile

Use npm as the only package manager. The required versions are recorded in
`package.json`, `package-lock.json`, and `.nvmrc`.

## Public-demo limits

| Boundary | Limit |
|---|---:|
| CSV file size | 2 MiB |
| Rows | 10,000 |
| Columns | 100 |
| Total cells | 500,000 |
| Header length | 128 characters |
| Cell length | 10,000 characters |
| Stored parsed JSON | 8 MiB |
| Numeric columns used for correlation | 30 |
| Upload attempts | 5 per anonymous identity per hour |
| Active datasets | 5 per anonymous identity |
| Processing reservation | 1 per identity per 30 seconds |
| Application processing deadline | 18 seconds within a 20-second route limit |
| Retention | Hidden at 24 hours; hourly physical cleanup |

These limits protect free Vercel and Supabase capacity. Raising them requires
profiling the JSONB storage and synchronous analysis path first.

## Local setup

1. Install the declared runtime and dependencies:

   ```powershell
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and set:

   | Variable | Visibility | Purpose |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` | Public | Supabase publishable/anon key |
   | `SUPABASE_SECRET_KEY` | Server-only secret | Invokes bounded write/quota RPCs after verification |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Turnstile widget key |
   | `TURNSTILE_SECRET_KEY` | Server-only secret | Verifies upload challenges for existing sessions |
   | `UPLOADS_ENABLED` | Server-only | Emergency upload kill switch; only `true` enables uploads |

   Never prefix the service-role or Turnstile secret with `NEXT_PUBLIC_`.
   Never log or commit their values.
   A legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted temporarily, but current
   Supabase `sb_secret_...` keys are preferred.

3. Start the development server:

   ```powershell
   npm run dev
   ```

4. Open <http://localhost:3000>.

Cloudflare provides test keys for automated/local testing. Use production keys
only with reviewed hostname restrictions.

## Database and Auth setup

The repository uses a versioned migration instead of dashboard-authored demo
policies:

```text
supabase/migrations/20260804000100_phase_2_security.sql
```

Before applying it, follow
[`supabase/PHASE_2_DEPLOYMENT.md`](supabase/PHASE_2_DEPLOYMENT.md). The migration
must be tested against the target schema and applied during a controlled cloud
checkpoint with uploads disabled.

Required Supabase Auth settings:

- enable anonymous sign-ins;
- configure Turnstile CAPTCHA for Auth;
- disable unused email/password signup for this anonymous-only demo;
- keep the service-role key server-only.

Do not recreate the former public `FOR ALL` policies. Anonymous identities use
the `authenticated` Postgres role; ownership and expiry are enforced by RLS.

## Runtime data flow

1. The browser selects a CSV and completes the Turnstile widget.
2. `POST /api/uploads` rejects disabled, cross-origin, oversized, or malformed
   requests before persistence.
3. Supabase verifies Turnstile while creating the first anonymous identity. For
   an existing identity, the application verifies the single-use token directly
   with Cloudflare Siteverify, including hostname and action.
4. A server-only Supabase client reserves an atomic quota slot.
5. The server decodes UTF-8, parses and validates CSV structure, bounds JSON
   expansion, and computes EDA results.
6. A service-role-only database function revalidates the reservation/envelope
   and atomically inserts the owned dataset and analysis.
7. Reads and deletes use the visitor's anonymous session and owner-based RLS.
8. RLS hides data at 24 hours; Supabase Cron removes expired datasets and later
   removes orphaned anonymous Auth users.

The complete parsed CSV currently remains a JSONB row. Pagination slices that
JSON after retrieval, so this is intentionally a small-file demo rather than a
large-data platform.

## Commands

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs a clean install followed by all four commands. Production builds need
non-secret build-time values for the public Supabase and Turnstile variables.

## Reports

Reports are rendered as print-friendly HTML. Use the browser's Print dialog to
save a searchable/selectable PDF. Pixel-identical PDF output is not a goal.

## Security operations

- Keep `UPLOADS_ENABLED=false` until the migration, Auth CAPTCHA, Turnstile,
  cross-session isolation tests, and production deployment checks pass.
- Delete the obsolete external-AI credential from Vercel; the application no
  longer reads or needs it.
- Protect preview deployments and configure available Vercel bot/firewall
  controls. Application quotas do not replace edge DDoS/bot controls.
- Monitor Vercel usage, Supabase database size/egress/Auth users, quota errors,
  and the cleanup job. Use conservative alerts at 50%, 75%, and 90%.
- During an incident, disable uploads first. Do not weaken RLS as a rollback.

## Known analysis behavior

Phase 0 characterization tests intentionally preserve several historical
statistical behaviors, including first-value type inference, broad date parsing,
population standard deviation, index-based quartiles, Boolean numeric coercion,
and row-misaligned correlations. Statistical corrections are planned as a
separate reviewed phase. Phase 2 only caps correlation work to 30 numeric
columns for resource safety.

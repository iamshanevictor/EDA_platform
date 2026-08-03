# Phase 2 Supabase deployment and recovery

This phase is intentionally split into repository changes and a later cloud
application checkpoint. Do not paste fragments of the migration into the SQL
editor. Apply the versioned migration as one reviewed unit after taking a
Supabase backup.

## Preconditions

1. Confirm the target project is `eda-platform` and take a restorable backup.
2. Confirm the visible row counts for all six existing public tables.
3. Export the current policies, grants, and foreign keys for rollback evidence.
4. Enable **Anonymous Sign-Ins** in Supabase Auth.
5. Disable unused email/password signup for this anonymous-only demo.
6. Configure Supabase Auth CAPTCHA with the same Turnstile site and secret keys
   used by the application. Supabase verifies the single-use token when the
   anonymous identity is first created; the application verifies it for later
   uploads in the same session.
7. Add a current `SUPABASE_SECRET_KEY` as a server-only Vercel variable. A
   legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted only during migration. Never
   use a `NEXT_PUBLIC_` prefix or expose either value to a Client Component.
8. Set `UPLOADS_ENABLED=false` in Vercel before applying the migration.

## Migration effect

`20260804000100_phase_2_security.sql`:

- preserves all existing rows;
- leaves legacy ownerless datasets inaccessible and exempt from automated
  deletion until ownership is decided separately;
- enables RLS and removes existing policies on all six public tables;
- revokes Data API access to the four unused legacy tables;
- permits anonymous authenticated users to read/delete only their own
  unexpired datasets and analyses;
- denies direct browser inserts and permits bounded writes only through
  service-role-only quota functions called after application verification;
- limits each identity to five attempts per hour, one processing attempt, and
  five active datasets;
- hides owned datasets at exactly 24 hours and schedules physical cleanup at
  minute 5 of each hour;
- removes orphaned anonymous Auth users after a 26-hour safety window.

## Apply and verify

Apply with the Supabase CLI from a reviewed, linked environment. Do not apply
directly from an unreviewed local branch.

After application, verify with separate anonymous sessions:

1. Session A can upload/read/delete its own dataset through the application.
2. Session B cannot select, analyze, report, or delete Session A's dataset ID.
3. Direct inserts by `anon` and `authenticated` are denied, and quota/write
   RPCs are executable only by `service_role`.
4. `categories`, `projects`, `submissions`, and `users` return permission denied.
5. An expired dataset is immediately hidden even before the hourly job runs.
6. `cron.job` contains exactly one enabled `purge-expired-demo-data` job.
7. A manual `select public.purge_expired_demo_data();` succeeds from an
   administrator connection and is denied through the Data API.

Only after these checks pass should the application deployment be promoted and
`UPLOADS_ENABLED=true` be set.

## Safe recovery

The preferred recovery is roll-forward. If application errors occur:

1. Set `UPLOADS_ENABLED=false` immediately.
2. Roll back the application deployment while leaving RLS and revoked grants
   in place. The old upload flow will fail closed instead of reopening data.
3. Unschedule cleanup only if it is implicated:

   ```sql
   select cron.unschedule(jobid)
   from cron.job
   where jobname = 'purge-expired-demo-data';
   ```

4. Restore the pre-migration database backup only after reviewing whether new
   Phase 2 rows would be lost.

Do not restore the previous public `FOR ALL` policies as a rollback mechanism.
Dropping ownership columns or quota records is destructive and requires a
separate reviewed migration.

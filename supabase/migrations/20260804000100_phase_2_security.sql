begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.datasets
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists expires_at timestamptz;

alter table public.datasets
  alter column owner_id set default auth.uid(),
  alter column expires_at set default (now() + interval '24 hours');

update public.datasets
set expires_at = created_at + interval '24 hours'
where expires_at is null;

alter table public.dataset_analyses
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.dataset_analyses
  alter column owner_id set default auth.uid();

update public.dataset_analyses as analysis
set owner_id = dataset.owner_id
from public.datasets as dataset
where analysis.dataset_id = dataset.id
  and analysis.owner_id is null
  and dataset.owner_id is not null;

create index if not exists datasets_owner_created_idx
  on public.datasets (owner_id, created_at desc);
create index if not exists datasets_expiry_idx
  on public.datasets (expires_at)
  where expires_at is not null;
create index if not exists dataset_analyses_owner_dataset_idx
  on public.dataset_analyses (owner_id, dataset_id);

create table if not exists private.upload_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  succeeded boolean
);

create index if not exists upload_attempts_owner_started_idx
  on private.upload_attempts (owner_id, started_at desc);

revoke all on table private.upload_attempts from public, anon, authenticated;

do $migration$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'datasets',
        'dataset_analyses',
        'categories',
        'projects',
        'submissions',
        'users'
      )
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$migration$;

alter table public.datasets enable row level security;
alter table public.dataset_analyses enable row level security;
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.submissions enable row level security;
alter table public.users enable row level security;

revoke all on table public.datasets from anon, authenticated;
revoke all on table public.dataset_analyses from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.users from anon, authenticated;

grant select, delete on table public.datasets to authenticated;
grant select, delete on table public.dataset_analyses to authenticated;

do $migration$
declare
  table_name text;
  sequence_name text;
begin
  foreach table_name in array array[
    'datasets',
    'dataset_analyses',
    'categories',
    'projects',
    'submissions',
    'users'
  ]
  loop
    sequence_name := pg_get_serial_sequence(format('public.%I', table_name), 'id');
    if sequence_name is not null then
      execute format(
        'revoke all on sequence %s from anon, authenticated',
        sequence_name
      );
    end if;
  end loop;

end
$migration$;

create policy "owners can read active datasets"
on public.datasets
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and expires_at > now()
);

create policy "owners can delete datasets"
on public.datasets
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

create policy "owners can read active analyses"
on public.dataset_analyses as permissive
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (
    select 1
    from public.datasets
    where datasets.id = dataset_analyses.dataset_id
      and datasets.owner_id = (select auth.uid())
      and datasets.expires_at > now()
  )
);

create policy "owners can delete analyses"
on public.dataset_analyses
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

create or replace function public.reserve_upload_attempt(requested_owner uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  attempt_id uuid;
begin
  if requested_owner is null or not exists (
    select 1
    from auth.users
    where id = requested_owner
      and is_anonymous is true
  ) then
    raise exception using
      errcode = '42501',
      message = 'anonymous authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(requested_owner::text, 0));

  if (
    select count(*)
    from private.upload_attempts
    where owner_id = requested_owner
      and started_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'hourly upload limit reached';
  end if;

  if exists (
    select 1
    from private.upload_attempts
    where owner_id = requested_owner
      and started_at > now() - interval '30 seconds'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'an upload is already processing';
  end if;

  if (
    select count(*)
    from public.datasets
    where owner_id = requested_owner
      and expires_at > now()
  ) >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'active dataset limit reached';
  end if;

  insert into private.upload_attempts (owner_id)
  values (requested_owner)
  returning id into attempt_id;

  return attempt_id;
end
$function$;

create or replace function public.finish_upload_attempt(
  attempt_id uuid,
  requested_owner uuid,
  was_successful boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  update private.upload_attempts
  set completed_at = now(),
      succeeded = was_successful
  where id = attempt_id
    and owner_id = requested_owner
    and completed_at is null;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'upload attempt not found';
  end if;
end
$function$;

create or replace function public.complete_upload_attempt(
  attempt_id uuid,
  requested_owner uuid,
  requested_file_name text,
  requested_file_size integer,
  requested_data jsonb,
  requested_summary_stats jsonb,
  requested_missing_values jsonb,
  requested_column_types jsonb,
  requested_correlation_matrix jsonb
)
returns table (dataset_id bigint, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  new_dataset_id bigint;
  new_expires_at timestamptz;
begin
  if requested_owner is null or not exists (
    select 1
    from auth.users
    where id = requested_owner
      and is_anonymous is true
  ) then
    raise exception using
      errcode = '42501',
      message = 'anonymous authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(requested_owner::text, 0));

  if not exists (
    select 1
    from private.upload_attempts
    where id = attempt_id
      and owner_id = requested_owner
      and completed_at is null
      and started_at > now() - interval '30 seconds'
  ) then
    raise exception using
      errcode = '42501',
      message = 'active upload reservation required';
  end if;

  if (
    select count(*)
    from public.datasets
    where owner_id = requested_owner
      and expires_at > now()
  ) >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'active dataset limit reached';
  end if;

  if requested_file_name is null
    or length(requested_file_name) = 0
    or length(requested_file_name) > 255
    or requested_file_name !~* '[.]csv$'
    or requested_file_size <= 0
    or requested_file_size > 2097152
    or requested_data is null
    or jsonb_typeof(requested_data) <> 'array'
    or jsonb_array_length(requested_data) = 0
    or jsonb_array_length(requested_data) > 10000
    or pg_column_size(requested_data) > 8388608
    or requested_summary_stats is null
    or jsonb_typeof(requested_summary_stats) <> 'object'
    or requested_missing_values is null
    or jsonb_typeof(requested_missing_values) <> 'object'
    or requested_column_types is null
    or jsonb_typeof(requested_column_types) <> 'object'
    or requested_correlation_matrix is null
    or jsonb_typeof(requested_correlation_matrix) <> 'object'
  then
    raise exception using
      errcode = '22023',
      message = 'upload payload is outside the allowed envelope';
  end if;

  insert into public.datasets (owner_id, file_name, file_size, data)
  values (requested_owner, requested_file_name, requested_file_size, requested_data)
  returning id, public.datasets.expires_at
  into new_dataset_id, new_expires_at;

  insert into public.dataset_analyses (
    owner_id,
    dataset_id,
    summary_stats,
    missing_values,
    column_types,
    correlation_matrix
  ) values (
    requested_owner,
    new_dataset_id,
    requested_summary_stats,
    requested_missing_values,
    requested_column_types,
    requested_correlation_matrix
  );

  update private.upload_attempts
  set completed_at = now(),
      succeeded = true
  where id = attempt_id
    and owner_id = requested_owner;

  return query select new_dataset_id, new_expires_at;
end
$function$;

revoke all on function public.reserve_upload_attempt(uuid) from public, anon, authenticated;
revoke all on function public.finish_upload_attempt(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.complete_upload_attempt(uuid, uuid, text, integer, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_upload_attempt(uuid) to service_role;
grant execute on function public.finish_upload_attempt(uuid, uuid, boolean) to service_role;
grant execute on function public.complete_upload_attempt(uuid, uuid, text, integer, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

create or replace function public.purge_expired_demo_data()
returns table (deleted_datasets bigint, deleted_users bigint)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  dataset_count bigint;
  user_count bigint;
begin
  delete from public.dataset_analyses as analysis
  using public.datasets as dataset
  where analysis.dataset_id = dataset.id
    and dataset.expires_at <= now();

  delete from public.datasets
  where expires_at <= now();
  get diagnostics dataset_count = row_count;

  delete from private.upload_attempts
  where started_at < now() - interval '48 hours';

  delete from auth.users as auth_user
  where auth_user.is_anonymous is true
    and auth_user.created_at < now() - interval '26 hours'
    and not exists (
      select 1
      from public.datasets
      where datasets.owner_id = auth_user.id
    );
  get diagnostics user_count = row_count;

  return query select dataset_count, user_count;
end
$function$;

revoke all on function public.purge_expired_demo_data() from public, anon, authenticated;

do $migration$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'purge-expired-demo-data'
  loop
    perform cron.unschedule(existing_job);
  end loop;
end
$migration$;

select cron.schedule(
  'purge-expired-demo-data',
  '5 * * * *',
  'select public.purge_expired_demo_data();'
);

commit;

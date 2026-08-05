-- Qualify datasets.expires_at inside complete_upload_attempt.
--
-- The function's table return type also declares an output parameter named
-- expires_at. PL/pgSQL therefore treats an unqualified expires_at reference as
-- ambiguous instead of resolving it to public.datasets.expires_at.

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
      and public.datasets.expires_at > now()
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

revoke all on function public.complete_upload_attempt(uuid, uuid, text, integer, jsonb, jsonb, jsonb, jsonb, jsonb)
from public, anon, authenticated;

grant execute on function public.complete_upload_attempt(uuid, uuid, text, integer, jsonb, jsonb, jsonb, jsonb, jsonb)
to service_role;

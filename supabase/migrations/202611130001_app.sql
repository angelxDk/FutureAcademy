-- The document payloads preserve the existing backup format and account identifiers.
-- Only the backend can access this table directly. Browser access is through scoped RPCs.
create sequence if not exists public.app_document_version;
create table if not exists public.app_documents (
  path text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version bigint not null default nextval('public.app_document_version')
);
alter table public.app_documents enable row level security;
revoke all on public.app_documents from public, anon, authenticated;
grant all on public.app_documents to service_role;
grant usage, select on sequence public.app_document_version to service_role;

create or replace function public.app_uid() returns text
language sql stable security invoker set search_path = '' as $$
  select case when auth.uid() is null then null else
    coalesce(nullif(auth.jwt()->'app_metadata'->>'legacy_uid', ''), auth.uid()::text) end;
$$;

-- All writers share the same lock. Versions prevent lost updates and ABA races.
-- This coarse lock is appropriate for the initial small beta; never make API calls while holding it.
create or replace function public.app_commit(p_reads jsonb, p_writes jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare item jsonb; actual bigint;
begin
  perform pg_advisory_xact_lock(814023);
  for item in select value from jsonb_array_elements(p_reads) loop
    select version into actual from public.app_documents where path = item->>'path';
    if actual is distinct from (item->>'version')::bigint then return false; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_writes) loop
    if (item->>'delete')::boolean is true then
      delete from public.app_documents where path = item->>'path';
    else
      insert into public.app_documents(path, data) values (item->>'path', item->'data')
      on conflict (path) do update set
        data = case when (item->>'merge')::boolean is true then app_documents.data || excluded.data else excluded.data end,
        version = nextval('public.app_document_version');
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.app_commit(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.app_commit(jsonb,jsonb) to service_role;

create or replace function public.app_load_snapshot(p_uid text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid text := public.app_uid(); result jsonb;
begin
  if uid is null or p_uid is null or uid <> p_uid then raise exception 'auth/required'; end if;
  if exists(select 1 from public.app_documents where path = 'accountDeletions/' || uid) then raise exception 'account/deleting'; end if;
  select jsonb_build_object('metadata', data, 'entries',
      coalesce((select jsonb_object_agg(split_part(e.path, '/', 4), e.data)
        from public.app_documents e where starts_with(e.path, 'users/' || public.app_uid() || '/entries/')), '{}'::jsonb))
      from public.app_documents where path = 'users/' || uid || '/data/state' into result;
  return result;
end;
$$;
revoke all on function public.app_load_snapshot(text) from public, anon;
grant execute on function public.app_load_snapshot(text) to authenticated;

create or replace function public.app_save_snapshot(p_uid text, p_revision bigint, p_saved_at bigint, p_changed jsonb, p_removed jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid text := public.app_uid(); current_revision bigint; item record; entry_key text;
begin
  if uid is null or p_uid is null or uid <> p_uid then raise exception 'auth/required'; end if;
  if p_revision is null or p_revision < 0 or p_saved_at is null or p_changed is null or p_removed is null or jsonb_typeof(p_changed) <> 'object' or jsonb_typeof(p_removed) <> 'array' then
    raise exception 'snapshot/invalid';
  end if;
  if (select count(*) from jsonb_object_keys(p_changed)) + jsonb_array_length(p_removed) > 450 then raise exception 'snapshot/too-large'; end if;
  perform pg_advisory_xact_lock(814023);
  if exists(select 1 from public.app_documents where path = 'accountDeletions/' || uid) then raise exception 'account/deleting'; end if;
  select coalesce((data->>'revision')::bigint, 0) into current_revision from public.app_documents where path = 'users/' || uid || '/data/state';
  current_revision := coalesce(current_revision, 0);
  if current_revision <> p_revision then raise exception 'sync/conflict'; end if;
  for item in select key, value from jsonb_each(p_changed) loop
    if length(item.key) not between 1 and 1400 or position('/' in item.key) > 0 or octet_length(item.value::text) > 800000
      or jsonb_typeof(item.value) <> 'object' or coalesce(item.value->>'kind','') not in ('setting','subjects','timetable','events','records','recordDrafts','studySessions','communities') then
      raise exception 'snapshot/invalid-entry';
    end if;
    insert into public.app_documents(path,data) values ('users/' || uid || '/entries/' || item.key,item.value)
    on conflict(path) do update set data=excluded.data, version=nextval('public.app_document_version');
  end loop;
  for entry_key in select jsonb_array_elements_text(p_removed) loop
    if position('/' in entry_key) > 0 then raise exception 'snapshot/invalid-entry'; end if;
    delete from public.app_documents where path = 'users/' || uid || '/entries/' || entry_key;
  end loop;
  insert into public.app_documents(path,data) values ('users/' || uid || '/data/state',jsonb_build_object('schemaVersion',2,'revision',current_revision+1,'savedAt',p_saved_at))
  on conflict(path) do update set data=excluded.data, version=nextval('public.app_document_version');
  return current_revision+1;
end;
$$;
revoke all on function public.app_save_snapshot(text,bigint,bigint,jsonb,jsonb) from public, anon;
grant execute on function public.app_save_snapshot(text,bigint,bigint,jsonb,jsonb) to authenticated;

create or replace function public.app_read_communities(p_group text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid text := public.app_uid(); result jsonb;
begin
  if uid is null then raise exception 'auth/required'; end if;
  if exists(select 1 from public.app_documents where path = 'accountDeletions/' || uid) then raise exception 'account/deleting'; end if;
  if p_group is null then
    select coalesce(jsonb_agg(data || jsonb_build_object('id',split_part(path,'/',2))), '[]'::jsonb) into result
      from public.app_documents where path ~ '^communities/[^/]+$' and data->'memberIds' ? uid;
  else
    if not exists(select 1 from public.app_documents where path='communities/' || p_group and data->'memberIds' ? uid) then raise exception 'community/forbidden'; end if;
    select coalesce(jsonb_agg(t.message order by t.created_at,t.path),'[]'::jsonb) into result from
      (select data || jsonb_build_object('id',split_part(path,'/',4)) as message, (data->>'createdAt')::bigint as created_at, path
       from public.app_documents where starts_with(path, 'communities/' || p_group || '/messages/') order by (data->>'createdAt')::bigint desc, path desc limit 100) t;
  end if;
  return result;
end;
$$;
revoke all on function public.app_read_communities(text) from public, anon;
grant execute on function public.app_read_communities(text) to authenticated;
-- app_uid contains no data access and still rejects anonymous identities.
revoke all on function public.app_uid() from public, anon;
grant execute on function public.app_uid() to authenticated, service_role;

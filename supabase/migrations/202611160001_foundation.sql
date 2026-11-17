-- Foundation: PostgreSQL transactions replace the legacy Firestore batch cap.
-- Bound each atomic write to 10,000 changes / 20 MiB while retaining account
-- ownership, revision checks and rollback of the entire write on failure.
create or replace function public.app_save_snapshot(p_uid text, p_revision bigint, p_saved_at bigint, p_changed jsonb, p_removed jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid text := public.app_uid(); current_revision bigint; item record; entry_key text;
begin
  if uid is null or p_uid is null or uid <> p_uid then raise exception 'auth/required'; end if;
  if p_revision is null or p_revision < 0 or p_saved_at is null or p_changed is null or p_removed is null or jsonb_typeof(p_changed) <> 'object' or jsonb_typeof(p_removed) <> 'array' then
    raise exception 'snapshot/invalid';
  end if;
  if (select count(*) from jsonb_object_keys(p_changed)) + jsonb_array_length(p_removed) > 10000 then raise exception 'snapshot/too-large'; end if;
  if octet_length(p_changed::text) + octet_length(p_removed::text) > 20971520 then raise exception 'snapshot/too-large'; end if;
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

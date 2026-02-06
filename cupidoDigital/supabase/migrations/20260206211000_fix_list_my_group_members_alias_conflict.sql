-- Fix ambiguity in list_my_group_members group_aliases upsert.

create or replace function public.list_my_group_members()
returns table (
  group_thread_id uuid,
  group_id uuid,
  group_key text,
  user_id text,
  member_alias text,
  member_display_name text,
  reveal_enabled boolean,
  is_self boolean,
  can_start_direct_message boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me text;
  v_group_id uuid;
  v_group_key text;
  v_group_thread_id uuid;
  v_reveal_enabled boolean;
begin
  v_me := public.current_request_user_id_required();

  select ugm.group_id, qg.group_key
  into v_group_id, v_group_key
  from public.user_group_memberships ugm
  join public.quiz_groups qg
    on qg.id = ugm.group_id
  where ugm.user_id = v_me;

  if v_group_id is null then
    raise exception 'primary group unavailable; submit quiz first' using errcode = '42501';
  end if;

  insert into public.group_threads (group_id)
  values (v_group_id)
  on conflict on constraint group_threads_group_id_key
  do update set group_id = excluded.group_id
  returning id into v_group_thread_id;

  select coalesce(
    (
      select s.reveal_enabled
      from public.app_settings s
      where s.id = 1
    ),
    false
  )
  into v_reveal_enabled;

  insert into public.group_aliases (thread_id, user_id, alias)
  select
    v_group_thread_id,
    ugm.user_id,
    public.deterministic_group_alias(v_group_thread_id, ugm.user_id)
  from public.user_group_memberships ugm
  where ugm.group_id = v_group_id
  on conflict on constraint group_aliases_pk do nothing;

  return query
  select
    v_group_thread_id,
    v_group_id,
    v_group_key,
    ugm.user_id,
    coalesce(ga.alias, public.deterministic_group_alias(v_group_thread_id, ugm.user_id)) as member_alias,
    case
      when v_reveal_enabled then
        coalesce(
          nullif(btrim(qr.user_name), ''),
          coalesce(ga.alias, public.deterministic_group_alias(v_group_thread_id, ugm.user_id))
        )
      else
        coalesce(ga.alias, public.deterministic_group_alias(v_group_thread_id, ugm.user_id))
    end as member_display_name,
    v_reveal_enabled,
    (ugm.user_id = v_me) as is_self,
    (ugm.user_id <> v_me) as can_start_direct_message
  from public.user_group_memberships ugm
  join public.quiz_responses qr
    on qr.user_id = ugm.user_id
  left join public.group_aliases ga
    on ga.thread_id = v_group_thread_id
   and ga.user_id = ugm.user_id
  where ugm.group_id = v_group_id
  order by ugm.user_id asc;
end;
$$;

grant execute on function public.list_my_group_members() to anon, authenticated;

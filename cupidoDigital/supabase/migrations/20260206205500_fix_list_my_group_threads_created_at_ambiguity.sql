-- Fix created_at ambiguity in list_my_group_threads upsert return.

create or replace function public.list_my_group_threads()
returns table (
  thread_id uuid,
  group_id uuid,
  group_key text,
  group_label text,
  created_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  reveal_enabled boolean,
  my_alias text,
  my_display_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me text;
  v_group_id uuid;
  v_group_key text;
  v_group_label text;
  v_thread_id uuid;
  v_reveal_enabled boolean;
  v_my_alias text;
  v_my_real_name text;
begin
  v_me := public.current_request_user_id_required();

  select
    ugm.group_id,
    qg.group_key,
    qg.label,
    nullif(btrim(qr.user_name), '')
  into
    v_group_id,
    v_group_key,
    v_group_label,
    v_my_real_name
  from public.user_group_memberships ugm
  join public.quiz_groups qg
    on qg.id = ugm.group_id
  join public.quiz_responses qr
    on qr.user_id = ugm.user_id
  where ugm.user_id = v_me;

  if v_group_id is null then
    raise exception 'primary group unavailable; submit quiz first' using errcode = '42501';
  end if;

  insert into public.group_threads (group_id)
  values (v_group_id)
  on conflict on constraint group_threads_group_id_key
  do update set group_id = excluded.group_id
  returning id into v_thread_id;

  v_my_alias := public.deterministic_group_alias(v_thread_id, v_me);

  insert into public.group_aliases (thread_id, user_id, alias)
  values (v_thread_id, v_me, v_my_alias)
  on conflict (thread_id, user_id) do nothing;

  select coalesce(
    (
      select s.reveal_enabled
      from public.app_settings s
      where s.id = 1
    ),
    false
  )
  into v_reveal_enabled;

  return query
  select
    gt.id,
    gt.group_id,
    v_group_key,
    v_group_label,
    gt.created_at,
    lm.created_at as last_message_at,
    lm.preview as last_message_preview,
    v_reveal_enabled,
    v_my_alias,
    case
      when v_reveal_enabled then coalesce(v_my_real_name, v_my_alias)
      else v_my_alias
    end as my_display_name
  from public.group_threads gt
  left join lateral (
    select
      gm.created_at,
      left(gm.body, 160) as preview
    from public.group_messages gm
    where gm.thread_id = gt.id
    order by gm.created_at desc, gm.id desc
    limit 1
  ) lm on true
  where gt.id = v_thread_id;
end;
$$;

grant execute on function public.list_my_group_threads() to anon, authenticated;

-- Fix PL/pgSQL output-variable ambiguity in group alias upserts.

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
  on conflict on constraint group_aliases_pk do nothing;

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

create or replace function public.send_group_message(
  p_thread_id uuid,
  p_body text
)
returns table (
  id bigint,
  thread_id uuid,
  sender_user_id text,
  sender_alias text,
  body text,
  created_at timestamptz,
  reveal_enabled boolean,
  sender_display_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me text;
  v_body text;
  v_group_id uuid;
  v_message_id bigint;
  v_created_at timestamptz;
  v_sender_alias text;
  v_sender_real_name text;
  v_reveal_enabled boolean;
begin
  v_me := public.current_request_user_id_required();

  if p_thread_id is null then
    raise exception 'thread_id is required' using errcode = '22023';
  end if;

  v_body := nullif(btrim(coalesce(p_body, '')), '');
  if v_body is null then
    raise exception 'message body must not be empty' using errcode = '22023';
  end if;

  select gt.group_id
  into v_group_id
  from public.group_threads gt
  where gt.id = p_thread_id;

  if v_group_id is null or not exists (
    select 1
    from public.user_group_memberships ugm
    where ugm.user_id = v_me
      and ugm.group_id = v_group_id
  ) then
    raise exception 'group thread not accessible' using errcode = '42501';
  end if;

  v_sender_alias := public.deterministic_group_alias(p_thread_id, v_me);

  insert into public.group_aliases (thread_id, user_id, alias)
  values (p_thread_id, v_me, v_sender_alias)
  on conflict on constraint group_aliases_pk do nothing;

  insert into public.group_messages (thread_id, sender_user_id, body)
  values (p_thread_id, v_me, v_body)
  returning group_messages.id, group_messages.created_at
  into v_message_id, v_created_at;

  select
    nullif(btrim(qr.user_name), ''),
    coalesce(
      (
        select s.reveal_enabled
        from public.app_settings s
        where s.id = 1
      ),
      false
    )
  into v_sender_real_name, v_reveal_enabled
  from public.quiz_responses qr
  where qr.user_id = v_me;

  return query
  select
    v_message_id,
    p_thread_id,
    v_me,
    v_sender_alias,
    v_body,
    v_created_at,
    v_reveal_enabled,
    case
      when v_reveal_enabled then coalesce(v_sender_real_name, v_sender_alias)
      else v_sender_alias
    end;
end;
$$;

grant execute on function public.list_my_group_threads() to anon, authenticated;
grant execute on function public.send_group_message(uuid, text) to anon, authenticated;

-- Add reveal-aware chat RPC fields driven by app_settings singleton (id=1).
-- Keeps participant-only access and preserves existing thread access invariants.

drop function if exists public.list_my_threads();

create or replace function public.list_my_threads()
returns table (
  thread_id uuid,
  user_a_id text,
  user_b_id text,
  other_user_id text,
  created_at timestamptz,
  revealed_at timestamptz,
  my_alias text,
  other_alias text,
  last_message_at timestamptz,
  last_message_preview text,
  reveal_enabled boolean,
  my_display_name text,
  other_display_name text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with me as (
    select public.current_request_user_id_required() as user_id
  ),
  settings as (
    select coalesce(
      (
        select s.reveal_enabled
        from public.app_settings s
        where s.id = 1
      ),
      false
    ) as reveal_enabled
  ),
  participant_threads as (
    select
      t.id,
      t.user_a_id,
      t.user_b_id,
      t.created_at,
      t.revealed_at,
      case
        when t.user_a_id = me.user_id then t.user_b_id
        else t.user_a_id
      end as other_user_id
    from public.chat_threads t
    cross join me
    where me.user_id in (t.user_a_id, t.user_b_id)
  ),
  thread_with_aliases as (
    select
      pt.id,
      pt.user_a_id,
      pt.user_b_id,
      pt.other_user_id,
      pt.created_at,
      pt.revealed_at,
      coalesce(
        my_alias.alias,
        'Anon-' || substr(md5(pt.id::text || ':' || me.user_id), 1, 8)
      ) as my_alias,
      coalesce(
        other_alias.alias,
        'Anon-' || substr(md5(pt.id::text || ':' || pt.other_user_id), 1, 8)
      ) as other_alias
    from participant_threads pt
    cross join me
    left join public.chat_aliases my_alias
      on my_alias.thread_id = pt.id
     and my_alias.user_id = me.user_id
    left join public.chat_aliases other_alias
      on other_alias.thread_id = pt.id
     and other_alias.user_id = pt.other_user_id
  )
  select
    twa.id as thread_id,
    twa.user_a_id,
    twa.user_b_id,
    twa.other_user_id,
    twa.created_at,
    twa.revealed_at,
    twa.my_alias,
    twa.other_alias,
    last_message.created_at as last_message_at,
    last_message.preview as last_message_preview,
    settings.reveal_enabled,
    case
      when settings.reveal_enabled then coalesce(nullif(btrim(my_profile.user_name), ''), twa.my_alias)
      else twa.my_alias
    end as my_display_name,
    case
      when settings.reveal_enabled then coalesce(nullif(btrim(other_profile.user_name), ''), twa.other_alias)
      else twa.other_alias
    end as other_display_name
  from thread_with_aliases twa
  cross join me
  cross join settings
  left join public.quiz_responses my_profile
    on my_profile.user_id = me.user_id
  left join public.quiz_responses other_profile
    on other_profile.user_id = twa.other_user_id
  left join lateral (
    select
      m.created_at,
      left(m.body, 160) as preview
    from public.chat_messages m
    where m.thread_id = twa.id
    order by m.created_at desc, m.id desc
    limit 1
  ) last_message on true
  order by coalesce(last_message.created_at, twa.created_at) desc;
$$;

drop function if exists public.list_thread_messages(uuid, integer);

create or replace function public.list_thread_messages(
  p_thread_id uuid,
  p_limit integer default 100
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
  v_limit integer;
  v_user_a text;
  v_user_b text;
  v_reveal_enabled boolean;
begin
  v_me := public.current_request_user_id_required();

  if p_thread_id is null then
    raise exception 'thread_id is required' using errcode = '22023';
  end if;

  v_limit := coalesce(p_limit, 100);
  if v_limit < 1 or v_limit > 500 then
    raise exception 'limit must be between 1 and 500' using errcode = '22023';
  end if;

  select t.user_a_id, t.user_b_id
  into v_user_a, v_user_b
  from public.chat_threads t
  where t.id = p_thread_id;

  if not found or v_me not in (v_user_a, v_user_b) then
    raise exception 'thread not accessible' using errcode = '42501';
  end if;

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
  with recent as (
    select
      m.id,
      m.thread_id,
      m.sender_user_id,
      m.body,
      m.created_at
    from public.chat_messages m
    where m.thread_id = p_thread_id
    order by m.created_at desc, m.id desc
    limit v_limit
  ),
  with_names as (
    select
      r.id,
      r.thread_id,
      r.sender_user_id,
      coalesce(
        a.alias,
        'Anon-' || substr(md5(r.thread_id::text || ':' || r.sender_user_id), 1, 8)
      ) as sender_alias,
      nullif(btrim(q.user_name), '') as sender_real_name,
      r.body,
      r.created_at
    from recent r
    left join public.chat_aliases a
      on a.thread_id = r.thread_id
     and a.user_id = r.sender_user_id
    left join public.quiz_responses q
      on q.user_id = r.sender_user_id
  )
  select
    wn.id,
    wn.thread_id,
    wn.sender_user_id,
    wn.sender_alias,
    wn.body,
    wn.created_at,
    v_reveal_enabled as reveal_enabled,
    case
      when v_reveal_enabled then coalesce(wn.sender_real_name, wn.sender_alias)
      else wn.sender_alias
    end as sender_display_name
  from with_names wn
  order by wn.created_at asc, wn.id asc;
end;
$$;

drop function if exists public.send_thread_message(uuid, text);

create or replace function public.send_thread_message(
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
  v_user_a text;
  v_user_b text;
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

  select t.user_a_id, t.user_b_id
  into v_user_a, v_user_b
  from public.chat_threads t
  where t.id = p_thread_id;

  if not found or v_me not in (v_user_a, v_user_b) then
    raise exception 'thread not accessible' using errcode = '42501';
  end if;

  insert into public.chat_messages (thread_id, sender_user_id, body)
  values (p_thread_id, v_me, v_body)
  returning chat_messages.id, chat_messages.created_at
  into v_message_id, v_created_at;

  select
    coalesce(
      (
        select a.alias
        from public.chat_aliases a
        where a.thread_id = p_thread_id
          and a.user_id = v_me
      ),
      'Anon-' || substr(md5(p_thread_id::text || ':' || v_me), 1, 8)
    ),
    (
      select nullif(btrim(q.user_name), '')
      from public.quiz_responses q
      where q.user_id = v_me
    ),
    coalesce(
      (
        select s.reveal_enabled
        from public.app_settings s
        where s.id = 1
      ),
      false
    )
  into v_sender_alias, v_sender_real_name, v_reveal_enabled;

  return query
  select
    v_message_id,
    p_thread_id,
    v_me,
    v_sender_alias,
    v_body,
    v_created_at,
    v_reveal_enabled as reveal_enabled,
    case
      when v_reveal_enabled then coalesce(v_sender_real_name, v_sender_alias)
      else v_sender_alias
    end as sender_display_name;
end;
$$;

grant execute on function public.list_my_threads() to anon, authenticated;
grant execute on function public.list_thread_messages(uuid, integer) to anon, authenticated;
grant execute on function public.send_thread_message(uuid, text) to anon, authenticated;

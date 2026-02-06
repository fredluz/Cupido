-- Finalize chat RPC surface for mutual-top3 gated thread creation and participant-only messaging.

create or replace function public.create_thread_if_mutual(match_user_id text)
returns public.chat_threads
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me text;
  v_match_user_id text;
  v_user_a text;
  v_user_b text;
  v_thread public.chat_threads;
begin
  v_me := public.current_request_user_id_required();
  v_match_user_id := nullif(btrim(match_user_id), '');

  if v_match_user_id is null then
    raise exception 'match_user_id is required' using errcode = '22023';
  end if;

  if v_me = v_match_user_id then
    raise exception 'cannot create thread with self' using errcode = '22023';
  end if;

  v_user_a := least(v_me, v_match_user_id);
  v_user_b := greatest(v_me, v_match_user_id);

  select *
  into v_thread
  from public.chat_threads
  where user_a_id = v_user_a
    and user_b_id = v_user_b;

  if found then
    -- Backfill aliases if rows were removed manually; deterministic alias keeps identity stable.
    insert into public.chat_aliases (thread_id, user_id, alias)
    values
      (v_thread.id, v_user_a, 'Anon-' || substr(md5(v_thread.id::text || ':' || v_user_a), 1, 8)),
      (v_thread.id, v_user_b, 'Anon-' || substr(md5(v_thread.id::text || ':' || v_user_b), 1, 8))
    on conflict (thread_id, user_id) do nothing;

    return v_thread;
  end if;

  if not exists (
    select 1
    from public.match_edges me
    where me.user_a_id = v_user_a
      and me.user_b_id = v_user_b
      and me.is_mutual_top3 = true
  ) then
    raise exception 'pair is not currently mutual top-3 eligible for chat' using errcode = '42501';
  end if;

  insert into public.chat_threads (user_a_id, user_b_id)
  values (v_user_a, v_user_b)
  on conflict (user_a_id, user_b_id)
  do update set
    user_a_id = excluded.user_a_id
  returning * into v_thread;

  insert into public.chat_aliases (thread_id, user_id, alias)
  values
    (v_thread.id, v_user_a, 'Anon-' || substr(md5(v_thread.id::text || ':' || v_user_a), 1, 8)),
    (v_thread.id, v_user_b, 'Anon-' || substr(md5(v_thread.id::text || ':' || v_user_b), 1, 8))
  on conflict (thread_id, user_id) do nothing;

  return v_thread;
end;
$$;

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
  last_message_preview text
)
language sql
security invoker
stable
set search_path = public, pg_temp
as $$
  with me as (
    select public.current_request_user_id_required() as user_id
  )
  select
    t.id as thread_id,
    t.user_a_id,
    t.user_b_id,
    case
      when t.user_a_id = me.user_id then t.user_b_id
      else t.user_a_id
    end as other_user_id,
    t.created_at,
    t.revealed_at,
    coalesce(
      my_alias.alias,
      'Anon-' || substr(md5(t.id::text || ':' || me.user_id), 1, 8)
    ) as my_alias,
    coalesce(
      other_alias.alias,
      'Anon-' || substr(
        md5(
          t.id::text
          || ':'
          || case when t.user_a_id = me.user_id then t.user_b_id else t.user_a_id end
        ),
        1,
        8
      )
    ) as other_alias,
    last_message.created_at as last_message_at,
    last_message.preview as last_message_preview
  from public.chat_threads t
  cross join me
  left join public.chat_aliases my_alias
    on my_alias.thread_id = t.id
   and my_alias.user_id = me.user_id
  left join public.chat_aliases other_alias
    on other_alias.thread_id = t.id
   and other_alias.user_id = case when t.user_a_id = me.user_id then t.user_b_id else t.user_a_id end
  left join lateral (
    select
      m.created_at,
      left(m.body, 160) as preview
    from public.chat_messages m
    where m.thread_id = t.id
    order by m.created_at desc, m.id desc
    limit 1
  ) last_message on true
  where me.user_id in (t.user_a_id, t.user_b_id)
  order by coalesce(last_message.created_at, t.created_at) desc;
$$;

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
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_me text;
  v_limit integer;
  v_user_a text;
  v_user_b text;
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
  )
  select
    r.id,
    r.thread_id,
    r.sender_user_id,
    coalesce(
      a.alias,
      'Anon-' || substr(md5(r.thread_id::text || ':' || r.sender_user_id), 1, 8)
    ) as sender_alias,
    r.body,
    r.created_at
  from recent r
  left join public.chat_aliases a
    on a.thread_id = r.thread_id
   and a.user_id = r.sender_user_id
  order by r.created_at asc, r.id asc;
end;
$$;

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
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_me text;
  v_body text;
  v_user_a text;
  v_user_b text;
  v_message_id bigint;
  v_created_at timestamptz;
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

  return query
  select
    v_message_id,
    p_thread_id,
    v_me,
    coalesce(
      (
        select a.alias
        from public.chat_aliases a
        where a.thread_id = p_thread_id
          and a.user_id = v_me
      ),
      'Anon-' || substr(md5(p_thread_id::text || ':' || v_me), 1, 8)
    ) as sender_alias,
    v_body,
    v_created_at;
end;
$$;

grant execute on function public.create_thread_if_mutual(text) to anon, authenticated;
grant execute on function public.list_my_threads() to anon, authenticated;
grant execute on function public.list_thread_messages(uuid, integer) to anon, authenticated;
grant execute on function public.send_thread_message(uuid, text) to anon, authenticated;

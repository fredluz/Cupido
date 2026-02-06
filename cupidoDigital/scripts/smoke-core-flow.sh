#!/usr/bin/env bash
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-}"
if [[ -z "${DB_URL}" ]]; then
  echo "SUPABASE_DB_URL is required (Supabase Postgres connection string)." >&2
  exit 1
fi

DB_URL_WITH_SSL="${DB_URL}"
if [[ "${DB_URL_WITH_SSL}" != *"sslmode="* ]]; then
  if [[ "${DB_URL_WITH_SSL}" == *"?"* ]]; then
    DB_URL_WITH_SSL="${DB_URL_WITH_SSL}&sslmode=require"
  else
    DB_URL_WITH_SSL="${DB_URL_WITH_SSL}?sslmode=require"
  fi
fi

if command -v psql >/dev/null 2>&1; then
  PSQL_CMD=(psql "${DB_URL_WITH_SSL}" -v ON_ERROR_STOP=1)
  echo "Using local psql client."
elif command -v docker >/dev/null 2>&1; then
  PSQL_CMD=(docker run --rm -i postgres:16-alpine psql "${DB_URL_WITH_SSL}" -v ON_ERROR_STOP=1)
  echo "Using Dockerized psql client (postgres:16-alpine)."
else
  echo "Neither psql nor docker is available. Install one to run smoke checks." >&2
  exit 1
fi

echo "Running core flow smoke checks against SUPABASE_DB_URL (all changes rollback)."

"${PSQL_CMD[@]}" <<'SQL'
begin;

do $$
declare
  v_run_suffix text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '_' || substr(md5(random()::text), 1, 6);
  v_prefix text := '000_smoke_' || v_run_suffix || '_';

  v_u1 text := v_prefix || 'a';
  v_u2 text := v_prefix || 'b';
  v_u3 text := v_prefix || 'c';
  v_u4 text := v_prefix || 'd';

  v_name1 text := 'Smoke Alpha ' || v_run_suffix;
  v_name2 text := 'Smoke Beta ' || v_run_suffix;
  v_name3 text := 'Smoke Gamma ' || v_run_suffix;
  v_name4 text := 'Smoke Delta ' || v_run_suffix;

  v_submit jsonb;

  v_group_id_u1 uuid;
  v_group_id_u3 uuid;
  v_group_thread_id uuid;
  v_dm_thread_id uuid;

  v_is_mutual_u1_u3 boolean := false;
  v_direct_message_count integer;
  v_direct_sender_count integer;
  v_group_message_count integer;
  v_group_sender_count integer;

  v_profile_lock_blocked boolean := false;

  v_initial_reveal boolean;
  v_before_direct_reveal boolean;
  v_after_direct_reveal boolean;
  v_before_group_reveal boolean;
  v_after_group_reveal boolean;
  v_before_direct_alias text;
  v_after_direct_alias text;
  v_before_direct_display text;
  v_after_direct_display text;
  v_before_group_alias text;
  v_after_group_alias text;
  v_before_group_display text;
  v_after_group_display text;

  v_group_threads_count integer;
  v_group_members_count integer;
begin
  raise notice 'smoke run prefix: %', v_prefix;

  perform set_config('app.current_user_id', v_u1, true);
  v_submit := public.submit_quiz_and_refresh_matches(
    jsonb_build_object(
      'user_name', v_name1,
      'course_code', 'L278',
      'study_year', 'year_1',
      'gender', 'm',
      'looking_for', 'f',
      'romantic', 14,
      'adventurous', 3,
      'intellectual', 6,
      'creative', 2,
      'chill', 7,
      'social', 5,
      'ambitious', 4
    )
  );
  if coalesce((v_submit ->> 'ok')::boolean, false) is not true then
    raise exception 'submit_quiz_and_refresh_matches failed for %: %', v_u1, v_submit;
  end if;

  perform set_config('app.current_user_id', v_u2, true);
  v_submit := public.submit_quiz_and_refresh_matches(
    jsonb_build_object(
      'user_name', v_name2,
      'course_code', 'L321',
      'study_year', 'year_2',
      'gender', 'f',
      'looking_for', 'm',
      'romantic', 14,
      'adventurous', 2,
      'intellectual', 7,
      'creative', 2,
      'chill', 8,
      'social', 6,
      'ambitious', 4
    )
  );
  if coalesce((v_submit ->> 'ok')::boolean, false) is not true then
    raise exception 'submit_quiz_and_refresh_matches failed for %: %', v_u2, v_submit;
  end if;

  perform set_config('app.current_user_id', v_u3, true);
  v_submit := public.submit_quiz_and_refresh_matches(
    jsonb_build_object(
      'user_name', v_name3,
      'course_code', 'L274',
      'study_year', 'year_1',
      'gender', 'm',
      'looking_for', 'f',
      'romantic', 13,
      'adventurous', 1,
      'intellectual', 8,
      'creative', 3,
      'chill', 6,
      'social', 2,
      'ambitious', 4
    )
  );
  if coalesce((v_submit ->> 'ok')::boolean, false) is not true then
    raise exception 'submit_quiz_and_refresh_matches failed for %: %', v_u3, v_submit;
  end if;

  perform set_config('app.current_user_id', v_u4, true);
  v_submit := public.submit_quiz_and_refresh_matches(
    jsonb_build_object(
      'user_name', v_name4,
      'course_code', 'L273',
      'study_year', 'year_3',
      'gender', 'f',
      'looking_for', 'm',
      'romantic', 2,
      'adventurous', 14,
      'intellectual', 3,
      'creative', 10,
      'chill', 5,
      'social', 12,
      'ambitious', 4
    )
  );
  if coalesce((v_submit ->> 'ok')::boolean, false) is not true then
    raise exception 'submit_quiz_and_refresh_matches failed for %: %', v_u4, v_submit;
  end if;

  select ugm.group_id into v_group_id_u1
  from public.user_group_memberships ugm
  where ugm.user_id = v_u1;

  select ugm.group_id into v_group_id_u3
  from public.user_group_memberships ugm
  where ugm.user_id = v_u3;

  if v_group_id_u1 is null or v_group_id_u3 is null then
    raise exception 'expected primary group membership rows for users %, %', v_u1, v_u3;
  end if;

  if v_group_id_u1 is distinct from v_group_id_u3 then
    raise exception 'expected same primary group for %, %', v_u1, v_u3;
  end if;

  select coalesce(me.is_mutual_top3, false)
  into v_is_mutual_u1_u3
  from public.match_edges me
  where me.user_a_id = least(v_u1, v_u3)
    and me.user_b_id = greatest(v_u1, v_u3);

  if v_is_mutual_u1_u3 then
    raise exception 'expected non-mutual pair for group-based DM test between % and %', v_u1, v_u3;
  end if;

  perform set_config('app.current_user_id', v_u1, true);
  select t.id
  into v_dm_thread_id
  from public.create_thread_if_mutual(v_u3) as t;

  if v_dm_thread_id is null then
    raise exception 'direct thread creation failed for same-group non-mutual users';
  end if;

  perform public.send_thread_message(v_dm_thread_id, 'direct hello from ' || v_u1);
  perform set_config('app.current_user_id', v_u3, true);
  perform public.send_thread_message(v_dm_thread_id, 'direct hello from ' || v_u3);

  perform set_config('app.current_user_id', v_u1, true);
  select count(*), count(distinct m.sender_user_id)
  into v_direct_message_count, v_direct_sender_count
  from public.list_thread_messages(v_dm_thread_id, 100) as m;

  if v_direct_message_count < 2 or v_direct_sender_count < 2 then
    raise exception 'direct chat message flow failed for thread %', v_dm_thread_id;
  end if;

  select g.group_thread_id
  into v_group_thread_id
  from public.list_my_group() as g
  limit 1;

  if v_group_thread_id is null then
    raise exception 'list_my_group did not return a group_thread_id';
  end if;

  select count(*) into v_group_threads_count from public.list_my_group_threads() as gt;
  if v_group_threads_count < 1 then
    raise exception 'list_my_group_threads returned no rows';
  end if;

  select count(*) into v_group_members_count from public.list_my_group_members() as gm;
  if v_group_members_count < 2 then
    raise exception 'expected at least 2 members in the same primary group';
  end if;

  perform public.send_group_message(v_group_thread_id, 'group hello from ' || v_u1);
  perform set_config('app.current_user_id', v_u3, true);
  perform public.send_group_message(v_group_thread_id, 'group hello from ' || v_u3);

  perform set_config('app.current_user_id', v_u1, true);
  select count(*), count(distinct m.sender_user_id)
  into v_group_message_count, v_group_sender_count
  from public.list_group_messages(v_group_thread_id, 100) as m;

  if v_group_message_count < 2 or v_group_sender_count < 2 then
    raise exception 'group chat message flow failed for thread %', v_group_thread_id;
  end if;

  begin
    perform public.submit_quiz_and_refresh_matches(
      jsonb_build_object(
        'user_name', v_name1 || ' changed',
        'course_code', 'L278',
        'study_year', 'year_1',
        'gender', 'm',
        'looking_for', 'f',
        'romantic', 14,
        'adventurous', 3,
        'intellectual', 6,
        'creative', 2,
        'chill', 7,
        'social', 5,
        'ambitious', 4
      )
    );
  exception
    when sqlstate '42501' then
      v_profile_lock_blocked := true;
  end;

  if not v_profile_lock_blocked then
    raise exception 'profile lock did not block changed submit for %', v_u1;
  end if;

  select coalesce((select s.reveal_enabled from public.app_settings s where s.id = 1), false)
  into v_initial_reveal;

  select m.reveal_enabled, m.sender_alias, m.sender_display_name
  into v_before_direct_reveal, v_before_direct_alias, v_before_direct_display
  from public.list_thread_messages(v_dm_thread_id, 100) m
  where m.sender_user_id = v_u3
  order by m.created_at desc, m.id desc
  limit 1;

  select m.reveal_enabled, m.sender_alias, m.sender_display_name
  into v_before_group_reveal, v_before_group_alias, v_before_group_display
  from public.list_group_messages(v_group_thread_id, 100) m
  where m.sender_user_id = v_u3
  order by m.created_at desc, m.id desc
  limit 1;

  insert into public.app_settings (id, reveal_enabled, revealed_at)
  values (1, not v_initial_reveal, case when not v_initial_reveal then timezone('utc', now()) else null end)
  on conflict (id)
  do update set
    reveal_enabled = excluded.reveal_enabled,
    revealed_at = excluded.revealed_at;

  select m.reveal_enabled, m.sender_alias, m.sender_display_name
  into v_after_direct_reveal, v_after_direct_alias, v_after_direct_display
  from public.list_thread_messages(v_dm_thread_id, 100) m
  where m.sender_user_id = v_u3
  order by m.created_at desc, m.id desc
  limit 1;

  select m.reveal_enabled, m.sender_alias, m.sender_display_name
  into v_after_group_reveal, v_after_group_alias, v_after_group_display
  from public.list_group_messages(v_group_thread_id, 100) m
  where m.sender_user_id = v_u3
  order by m.created_at desc, m.id desc
  limit 1;

  if v_after_direct_reveal is distinct from (not v_initial_reveal)
     or v_after_group_reveal is distinct from (not v_initial_reveal) then
    raise exception 'reveal flags did not update as expected for direct/group messages';
  end if;

  if not v_initial_reveal then
    if v_after_direct_display is distinct from v_name3
       or v_after_group_display is distinct from v_name3 then
      raise exception 'expected real names after reveal toggle';
    end if;
  else
    if v_after_direct_display is distinct from v_after_direct_alias
       or v_after_group_display is distinct from v_after_group_alias then
      raise exception 'expected aliases after reveal disable';
    end if;
  end if;

  raise notice 'smoke checks passed for prefix % (transaction will rollback)', v_prefix;
end;
$$ language plpgsql;

rollback;
SQL

echo "Smoke checks passed."

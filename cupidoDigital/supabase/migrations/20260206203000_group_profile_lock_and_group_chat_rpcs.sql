-- Add profile-lock enforcement, primary-group assignment, group chat RPCs,
-- and expand direct message eligibility to mutual-top3 OR same primary group.

alter table public.quiz_groups
  add column if not exists description text;

update public.quiz_groups
set description = coalesce(
  nullif(btrim(description), ''),
  'Placeholder group for ' || initcap(replace(group_key, '_', ' '))
);

create or replace function public.normalize_study_year(p_value text)
returns text
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_value, '')))
    when '' then null
    when '1' then 'year_1'
    when 'year_1' then 'year_1'
    when 'year1' then 'year_1'
    when 'first year' then 'year_1'
    when '2' then 'year_2'
    when 'year_2' then 'year_2'
    when 'year2' then 'year_2'
    when 'second year' then 'year_2'
    when '3' then 'year_3'
    when 'year_3' then 'year_3'
    when 'year3' then 'year_3'
    when 'third year' then 'year_3'
    else null
  end;
$$;

create or replace function public.enforce_profile_lock()
returns trigger
language plpgsql
as $$
begin
  if old.profile_locked_at is null then
    return new;
  end if;

  if new.user_name is distinct from old.user_name
     or new.phone is distinct from old.phone
     or new.instagram_handle is distinct from old.instagram_handle
     or new.gender is distinct from old.gender
     or new.looking_for is distinct from old.looking_for
     or new.course_code is distinct from old.course_code
     or new.study_year is distinct from old.study_year
     or new.romantic is distinct from old.romantic
     or new.adventurous is distinct from old.adventurous
     or new.intellectual is distinct from old.intellectual
     or new.creative is distinct from old.creative
     or new.chill is distinct from old.chill
     or new.social is distinct from old.social
     or new.ambitious is distinct from old.ambitious then
    raise exception 'profile is locked; onboarding and quiz fields cannot be changed'
      using errcode = '42501';
  end if;

  if new.profile_locked_at is distinct from old.profile_locked_at then
    raise exception 'profile is locked; lock timestamp cannot be changed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_quiz_responses_enforce_profile_lock on public.quiz_responses;
create trigger trg_quiz_responses_enforce_profile_lock
before update on public.quiz_responses
for each row
execute function public.enforce_profile_lock();

create or replace function public.submit_quiz_and_refresh_matches(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_existing public.quiz_responses;
  v_row public.quiz_responses;
  v_now timestamptz := timezone('utc', now());
  v_max_distance double precision := sqrt(7 * power(14::double precision, 2));

  v_default_course_code text;

  v_payload_user_name text;
  v_payload_phone text;
  v_payload_instagram_handle text;
  v_payload_gender text;
  v_payload_looking_for text;
  v_payload_course_code text;
  v_payload_study_year text;
  v_payload_romantic integer;
  v_payload_adventurous integer;
  v_payload_intellectual integer;
  v_payload_creative integer;
  v_payload_chill integer;
  v_payload_social integer;
  v_payload_ambitious integer;

  v_user_name text;
  v_phone text;
  v_instagram_handle text;
  v_gender text;
  v_looking_for text;
  v_course_code text;
  v_study_year text;
  v_romantic integer;
  v_adventurous integer;
  v_intellectual integer;
  v_creative integer;
  v_chill integer;
  v_social integer;
  v_ambitious integer;

  v_primary_group_key text;
  v_primary_group_id uuid;
begin
  v_user_id := public.current_request_user_id_required();

  select code
  into v_default_course_code
  from public.course_options
  where is_active = true
  order by sort_order asc, code asc
  limit 1;

  v_payload_user_name := nullif(coalesce(payload ->> 'user_name', payload ->> 'name'), '');
  v_payload_phone := nullif(payload ->> 'phone', '');
  v_payload_instagram_handle := nullif(payload ->> 'instagram_handle', '');
  v_payload_gender := nullif(payload ->> 'gender', '');
  v_payload_looking_for := nullif(payload ->> 'looking_for', '');
  v_payload_course_code := nullif(payload ->> 'course_code', '');

  if payload ? 'study_year' then
    v_payload_study_year := public.normalize_study_year(payload ->> 'study_year');
    if v_payload_study_year is null then
      raise exception 'invalid study_year; expected year_1/year_2/year_3'
        using errcode = '22023';
    end if;
  end if;

  v_payload_romantic := coalesce((payload ->> 'romantic')::integer, null);
  v_payload_adventurous := coalesce((payload ->> 'adventurous')::integer, null);
  v_payload_intellectual := coalesce((payload ->> 'intellectual')::integer, null);
  v_payload_creative := coalesce((payload ->> 'creative')::integer, null);
  v_payload_chill := coalesce((payload ->> 'chill')::integer, null);
  v_payload_social := coalesce((payload ->> 'social')::integer, null);
  v_payload_ambitious := coalesce((payload ->> 'ambitious')::integer, null);

  if v_payload_course_code is not null and not exists (
    select 1
    from public.course_options co
    where co.code = v_payload_course_code
      and co.is_active = true
  ) then
    raise exception 'invalid course_code: %', v_payload_course_code using errcode = '22023';
  end if;

  select *
  into v_existing
  from public.quiz_responses
  where user_id = v_user_id
  for update;

  if found then
    v_user_name := coalesce(v_payload_user_name, v_existing.user_name);
    v_phone := coalesce(v_payload_phone, v_existing.phone);
    v_instagram_handle := coalesce(v_payload_instagram_handle, v_existing.instagram_handle);
    v_gender := coalesce(v_payload_gender, v_existing.gender);
    v_looking_for := coalesce(v_payload_looking_for, v_existing.looking_for);
    v_course_code := coalesce(v_payload_course_code, v_existing.course_code, v_default_course_code);
    v_study_year := coalesce(v_payload_study_year, v_existing.study_year, 'year_1');

    v_romantic := coalesce(v_payload_romantic, v_existing.romantic, 0);
    v_adventurous := coalesce(v_payload_adventurous, v_existing.adventurous, 0);
    v_intellectual := coalesce(v_payload_intellectual, v_existing.intellectual, 0);
    v_creative := coalesce(v_payload_creative, v_existing.creative, 0);
    v_chill := coalesce(v_payload_chill, v_existing.chill, 0);
    v_social := coalesce(v_payload_social, v_existing.social, 0);
    v_ambitious := coalesce(v_payload_ambitious, v_existing.ambitious, 0);

    update public.quiz_responses
    set
      user_name = v_user_name,
      phone = v_phone,
      instagram_handle = v_instagram_handle,
      gender = v_gender,
      looking_for = v_looking_for,
      course_code = v_course_code,
      study_year = v_study_year,
      romantic = v_romantic,
      adventurous = v_adventurous,
      intellectual = v_intellectual,
      creative = v_creative,
      chill = v_chill,
      social = v_social,
      ambitious = v_ambitious,
      profile_locked_at = coalesce(profile_locked_at, v_now),
      updated_at = v_now
    where user_id = v_user_id
    returning * into v_row;
  else
    v_user_name := v_payload_user_name;
    v_phone := v_payload_phone;
    v_instagram_handle := v_payload_instagram_handle;
    v_gender := v_payload_gender;
    v_looking_for := v_payload_looking_for;
    v_course_code := coalesce(v_payload_course_code, v_default_course_code);
    v_study_year := coalesce(v_payload_study_year, 'year_1');

    v_romantic := coalesce(v_payload_romantic, 0);
    v_adventurous := coalesce(v_payload_adventurous, 0);
    v_intellectual := coalesce(v_payload_intellectual, 0);
    v_creative := coalesce(v_payload_creative, 0);
    v_chill := coalesce(v_payload_chill, 0);
    v_social := coalesce(v_payload_social, 0);
    v_ambitious := coalesce(v_payload_ambitious, 0);

    insert into public.quiz_responses (
      user_id,
      user_name,
      phone,
      instagram_handle,
      gender,
      looking_for,
      course_code,
      study_year,
      romantic,
      adventurous,
      intellectual,
      creative,
      chill,
      social,
      ambitious,
      profile_locked_at
    )
    values (
      v_user_id,
      v_user_name,
      v_phone,
      v_instagram_handle,
      v_gender,
      v_looking_for,
      v_course_code,
      v_study_year,
      v_romantic,
      v_adventurous,
      v_intellectual,
      v_creative,
      v_chill,
      v_social,
      v_ambitious,
      v_now
    )
    returning * into v_row;
  end if;

  select ranked.group_key, ranked.group_id
  into v_primary_group_key, v_primary_group_id
  from (
    select
      g.group_key,
      g.id as group_id,
      g.sort_order,
      case g.group_key
        when 'romantic' then v_row.romantic
        when 'adventurous' then v_row.adventurous
        when 'intellectual' then v_row.intellectual
        when 'creative' then v_row.creative
        when 'chill' then v_row.chill
        when 'social' then v_row.social
        when 'ambitious' then v_row.ambitious
        else 0
      end as score
    from public.quiz_groups g
  ) as ranked
  order by ranked.score desc, ranked.sort_order asc, ranked.group_key asc
  limit 1;

  if v_primary_group_id is null then
    raise exception 'quiz_groups is not seeded' using errcode = '22023';
  end if;

  insert into public.user_group_memberships (user_id, group_id, is_primary, created_at, updated_at)
  values (v_user_id, v_primary_group_id, true, v_now, v_now)
  on conflict (user_id)
  do update set
    group_id = excluded.group_id,
    is_primary = true,
    updated_at = v_now;

  insert into public.group_threads (group_id)
  values (v_primary_group_id)
  on conflict (group_id) do nothing;

  insert into public.group_aliases (thread_id, user_id, alias)
  select
    gt.id,
    v_user_id,
    public.deterministic_group_alias(gt.id, v_user_id)
  from public.group_threads gt
  where gt.group_id = v_primary_group_id
  on conflict (thread_id, user_id) do nothing;

  drop table if exists tmp_caller_candidates;
  create temporary table tmp_caller_candidates (
    candidate_user_id text primary key,
    compatibility integer not null,
    caller_rank integer not null
  ) on commit drop;

  insert into tmp_caller_candidates (candidate_user_id, compatibility, caller_rank)
  with scored as (
    select
      other.user_id as candidate_user_id,
      greatest(
        0,
        least(
          100,
          round(
            100 * (
              1 - power(
                sqrt(
                  power((v_row.romantic - other.romantic)::double precision, 2)
                  + power((v_row.adventurous - other.adventurous)::double precision, 2)
                  + power((v_row.intellectual - other.intellectual)::double precision, 2)
                  + power((v_row.creative - other.creative)::double precision, 2)
                  + power((v_row.chill - other.chill)::double precision, 2)
                  + power((v_row.social - other.social)::double precision, 2)
                  + power((v_row.ambitious - other.ambitious)::double precision, 2)
                ) / v_max_distance,
                0.6
              )
            )
          )::integer
        )
      ) as compatibility
    from public.quiz_responses other
    where other.user_id <> v_user_id
      and (
        (
          v_row.looking_for = 'mf'
          and (other.looking_for = 'mf' or other.looking_for = v_row.gender)
        )
        or
        (
          v_row.looking_for in ('m', 'f')
          and other.gender = v_row.looking_for
          and (other.looking_for = 'mf' or other.looking_for = v_row.gender)
        )
      )
  )
  select
    s.candidate_user_id,
    s.compatibility,
    row_number() over (
      order by s.compatibility desc, s.candidate_user_id asc
    ) as caller_rank
  from scored s;

  insert into public.match_edges (
    user_a_id,
    user_b_id,
    compatibility_a_to_b,
    compatibility_b_to_a,
    is_mutual_top3,
    refreshed_at
  )
  select
    least(v_user_id, c.candidate_user_id) as user_a_id,
    greatest(v_user_id, c.candidate_user_id) as user_b_id,
    c.compatibility as compatibility_a_to_b,
    c.compatibility as compatibility_b_to_a,
    false as is_mutual_top3,
    v_now as refreshed_at
  from tmp_caller_candidates c
  on conflict (user_a_id, user_b_id)
  do update set
    compatibility_a_to_b = excluded.compatibility_a_to_b,
    compatibility_b_to_a = excluded.compatibility_b_to_a,
    refreshed_at = excluded.refreshed_at;

  drop table if exists tmp_candidate_has_caller_top3;
  create temporary table tmp_candidate_has_caller_top3 (
    candidate_user_id text primary key,
    has_caller_top3 boolean not null
  ) on commit drop;

  insert into tmp_candidate_has_caller_top3 (candidate_user_id, has_caller_top3)
  with candidate_pool as (
    select c.candidate_user_id
    from tmp_caller_candidates c
  ),
  scored as (
    select
      cp.candidate_user_id,
      other.user_id as other_user_id,
      greatest(
        0,
        least(
          100,
          round(
            100 * (
              1 - power(
                sqrt(
                  power((candidate.romantic - other.romantic)::double precision, 2)
                  + power((candidate.adventurous - other.adventurous)::double precision, 2)
                  + power((candidate.intellectual - other.intellectual)::double precision, 2)
                  + power((candidate.creative - other.creative)::double precision, 2)
                  + power((candidate.chill - other.chill)::double precision, 2)
                  + power((candidate.social - other.social)::double precision, 2)
                  + power((candidate.ambitious - other.ambitious)::double precision, 2)
                ) / v_max_distance,
                0.6
              )
            )
          )::integer
        )
      ) as compatibility
    from candidate_pool cp
    join public.quiz_responses candidate
      on candidate.user_id = cp.candidate_user_id
    join public.quiz_responses other
      on other.user_id <> candidate.user_id
    where (
      (
        candidate.looking_for = 'mf'
        and (other.looking_for = 'mf' or other.looking_for = candidate.gender)
      )
      or
      (
        candidate.looking_for in ('m', 'f')
        and other.gender = candidate.looking_for
        and (other.looking_for = 'mf' or other.looking_for = candidate.gender)
      )
    )
  ),
  ranked as (
    select
      s.candidate_user_id,
      s.other_user_id,
      row_number() over (
        partition by s.candidate_user_id
        order by s.compatibility desc, s.other_user_id asc
      ) as candidate_rank
    from scored s
  )
  select
    cp.candidate_user_id,
    coalesce(bool_or(r.other_user_id = v_user_id and r.candidate_rank <= 3), false) as has_caller_top3
  from candidate_pool cp
  left join ranked r
    on r.candidate_user_id = cp.candidate_user_id
  group by cp.candidate_user_id;

  update public.match_edges me
  set
    is_mutual_top3 = (c.caller_rank <= 3 and coalesce(ch.has_caller_top3, false)),
    refreshed_at = v_now
  from tmp_caller_candidates c
  left join tmp_candidate_has_caller_top3 ch
    on ch.candidate_user_id = c.candidate_user_id
  where me.user_a_id = least(v_user_id, c.candidate_user_id)
    and me.user_b_id = greatest(v_user_id, c.candidate_user_id);

  update public.match_edges me
  set
    is_mutual_top3 = false,
    refreshed_at = v_now
  where (me.user_a_id = v_user_id or me.user_b_id = v_user_id)
    and not exists (
      select 1
      from tmp_caller_candidates c
      where me.user_a_id = least(v_user_id, c.candidate_user_id)
        and me.user_b_id = greatest(v_user_id, c.candidate_user_id)
    );

  return jsonb_build_object(
    'ok', true,
    'matches_refreshed', true,
    'user_id', v_row.user_id,
    'profile_locked', (v_row.profile_locked_at is not null),
    'primary_group', jsonb_build_object(
      'group_id', v_primary_group_id,
      'group_key', v_primary_group_key
    ),
    'quiz_response', to_jsonb(v_row),
    'top_matches',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'rank', c.caller_rank,
              'user_id', q.user_id,
              'user_name', q.user_name,
              'phone', q.phone,
              'instagram_handle', q.instagram_handle,
              'gender', q.gender,
              'looking_for', q.looking_for,
              'compatibility', c.compatibility,
              'is_mutual_top3', me.is_mutual_top3,
              'primary_group_key', qg.group_key
            )
            order by c.caller_rank
          )
          from tmp_caller_candidates c
          join public.quiz_responses q
            on q.user_id = c.candidate_user_id
          left join public.match_edges me
            on me.user_a_id = least(v_user_id, c.candidate_user_id)
           and me.user_b_id = greatest(v_user_id, c.candidate_user_id)
          left join public.user_group_memberships ugm
            on ugm.user_id = q.user_id
          left join public.quiz_groups qg
            on qg.id = ugm.group_id
          where c.caller_rank <= 3
        ),
        '[]'::jsonb
      )
  );
end;
$$;

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
  v_is_mutual_top3 boolean := false;
  v_same_primary_group boolean := false;
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
    insert into public.chat_aliases (thread_id, user_id, alias)
    values
      (v_thread.id, v_user_a, 'Anon-' || substr(md5(v_thread.id::text || ':' || v_user_a), 1, 8)),
      (v_thread.id, v_user_b, 'Anon-' || substr(md5(v_thread.id::text || ':' || v_user_b), 1, 8))
    on conflict (thread_id, user_id) do nothing;

    return v_thread;
  end if;

  select coalesce(me.is_mutual_top3, false)
  into v_is_mutual_top3
  from public.match_edges me
  where me.user_a_id = v_user_a
    and me.user_b_id = v_user_b;

  select exists (
    select 1
    from public.user_group_memberships mine
    join public.user_group_memberships theirs
      on theirs.group_id = mine.group_id
    where mine.user_id = v_me
      and theirs.user_id = v_match_user_id
  )
  into v_same_primary_group;

  if not (coalesce(v_is_mutual_top3, false) or v_same_primary_group) then
    raise exception 'pair is not eligible for direct chat (requires mutual top-3 or same primary group)'
      using errcode = '42501';
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

create or replace function public.list_my_group()
returns table (
  group_id uuid,
  group_key text,
  group_label text,
  group_description text,
  group_thread_id uuid,
  member_count bigint,
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
  v_group_description text;
  v_thread_id uuid;
  v_reveal_enabled boolean;
  v_my_alias text;
  v_my_real_name text;
  v_member_count bigint;
begin
  v_me := public.current_request_user_id_required();

  select
    ugm.group_id,
    qg.group_key,
    qg.label,
    qg.description,
    nullif(btrim(qr.user_name), '')
  into
    v_group_id,
    v_group_key,
    v_group_label,
    v_group_description,
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
  on conflict (group_id)
  do update set group_id = excluded.group_id
  returning id into v_thread_id;

  v_my_alias := public.deterministic_group_alias(v_thread_id, v_me);

  insert into public.group_aliases (thread_id, user_id, alias)
  values (v_thread_id, v_me, v_my_alias)
  on conflict (thread_id, user_id) do nothing;

  select count(*)
  into v_member_count
  from public.user_group_memberships m
  where m.group_id = v_group_id;

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
    v_group_id,
    v_group_key,
    v_group_label,
    v_group_description,
    v_thread_id,
    v_member_count,
    v_reveal_enabled,
    v_my_alias,
    case
      when v_reveal_enabled then coalesce(v_my_real_name, v_my_alias)
      else v_my_alias
    end;
end;
$$;

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
  v_thread_created_at timestamptz;
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
  on conflict (group_id)
  do update set group_id = excluded.group_id
  returning id, created_at into v_thread_id, v_thread_created_at;

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
  on conflict (group_id)
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
  on conflict (thread_id, user_id) do nothing;

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

create or replace function public.list_group_messages(
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
  v_group_id uuid;
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
      gm.id,
      gm.thread_id,
      gm.sender_user_id,
      gm.body,
      gm.created_at
    from public.group_messages gm
    where gm.thread_id = p_thread_id
    order by gm.created_at desc, gm.id desc
    limit v_limit
  ),
  with_aliases as (
    select
      r.id,
      r.thread_id,
      r.sender_user_id,
      coalesce(
        ga.alias,
        public.deterministic_group_alias(r.thread_id, r.sender_user_id)
      ) as sender_alias,
      nullif(btrim(qr.user_name), '') as sender_real_name,
      r.body,
      r.created_at
    from recent r
    left join public.group_aliases ga
      on ga.thread_id = r.thread_id
     and ga.user_id = r.sender_user_id
    left join public.quiz_responses qr
      on qr.user_id = r.sender_user_id
  )
  select
    wa.id,
    wa.thread_id,
    wa.sender_user_id,
    wa.sender_alias,
    wa.body,
    wa.created_at,
    v_reveal_enabled,
    case
      when v_reveal_enabled then coalesce(wa.sender_real_name, wa.sender_alias)
      else wa.sender_alias
    end as sender_display_name
  from with_aliases wa
  order by wa.created_at asc, wa.id asc;
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
  on conflict (thread_id, user_id) do nothing;

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

grant execute on function public.normalize_study_year(text) to anon, authenticated;
grant execute on function public.submit_quiz_and_refresh_matches(jsonb) to anon, authenticated;
grant execute on function public.create_thread_if_mutual(text) to anon, authenticated;
grant execute on function public.list_my_group() to anon, authenticated;
grant execute on function public.list_my_group_threads() to anon, authenticated;
grant execute on function public.list_my_group_members() to anon, authenticated;
grant execute on function public.list_group_messages(uuid, integer) to anon, authenticated;
grant execute on function public.send_group_message(uuid, text) to anon, authenticated;

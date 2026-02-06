-- Upgrade submit_quiz_and_refresh_matches to perform DB-side ranking + mutual top-3 refresh.
-- Tie handling is deterministic: compatibility DESC, then user_id ASC.

create or replace function public.submit_quiz_and_refresh_matches(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_row public.quiz_responses;
  v_now timestamptz := timezone('utc', now());
  v_max_distance double precision := sqrt(7 * power(14::double precision, 2));
begin
  v_user_id := public.current_request_user_id_required();

  insert into public.quiz_responses (
    user_id,
    user_name,
    phone,
    instagram_handle,
    gender,
    looking_for,
    romantic,
    adventurous,
    intellectual,
    creative,
    chill,
    social,
    ambitious
  )
  values (
    v_user_id,
    nullif(payload ->> 'user_name', ''),
    nullif(payload ->> 'phone', ''),
    nullif(payload ->> 'instagram_handle', ''),
    nullif(payload ->> 'gender', ''),
    nullif(payload ->> 'looking_for', ''),
    coalesce((payload ->> 'romantic')::integer, 0),
    coalesce((payload ->> 'adventurous')::integer, 0),
    coalesce((payload ->> 'intellectual')::integer, 0),
    coalesce((payload ->> 'creative')::integer, 0),
    coalesce((payload ->> 'chill')::integer, 0),
    coalesce((payload ->> 'social')::integer, 0),
    coalesce((payload ->> 'ambitious')::integer, 0)
  )
  on conflict (user_id)
  do update set
    user_name = coalesce(excluded.user_name, public.quiz_responses.user_name),
    phone = coalesce(excluded.phone, public.quiz_responses.phone),
    instagram_handle = coalesce(excluded.instagram_handle, public.quiz_responses.instagram_handle),
    gender = coalesce(excluded.gender, public.quiz_responses.gender),
    looking_for = coalesce(excluded.looking_for, public.quiz_responses.looking_for),
    romantic = excluded.romantic,
    adventurous = excluded.adventurous,
    intellectual = excluded.intellectual,
    creative = excluded.creative,
    chill = excluded.chill,
    social = excluded.social,
    ambitious = excluded.ambitious,
    updated_at = v_now
  returning * into v_row;

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

  -- Upsert caller-involved edges for currently compatible pairs (ordered pair invariants).
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

  -- True only when caller has candidate in top-3 and candidate has caller in top-3.
  update public.match_edges me
  set
    is_mutual_top3 = (c.caller_rank <= 3 and coalesce(ch.has_caller_top3, false)),
    refreshed_at = v_now
  from tmp_caller_candidates c
  left join tmp_candidate_has_caller_top3 ch
    on ch.candidate_user_id = c.candidate_user_id
  where me.user_a_id = least(v_user_id, c.candidate_user_id)
    and me.user_b_id = greatest(v_user_id, c.candidate_user_id);

  -- Caller pairs that are no longer reciprocal-compatible must not stay marked mutual.
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
              'is_mutual_top3', me.is_mutual_top3
            )
            order by c.caller_rank
          )
          from tmp_caller_candidates c
          join public.quiz_responses q
            on q.user_id = c.candidate_user_id
          left join public.match_edges me
            on me.user_a_id = least(v_user_id, c.candidate_user_id)
           and me.user_b_id = greatest(v_user_id, c.candidate_user_id)
          where c.caller_rank <= 3
        ),
        '[]'::jsonb
      )
  );
end;
$$;

grant execute on function public.submit_quiz_and_refresh_matches(jsonb) to anon, authenticated;

-- Факты для раздела «Достижения» в профиле игрока (по электронному бланку сайта и начислениям Respect).
-- Архивы, mafgame, зал славы и титулы считаются на сайте из уже загруженных данных профиля.
create or replace function public.player_achievement_facts(p_profile uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mp as (
    select m.id, m.finished_at, m.log, x.seat, x.role, x.win, x.first_killed, x.best_move
    from public.match_players x
    join public.matches m on m.id = x.match_id
    where x.profile_id = p_profile and m.status = 'finished'
  ),
  blacks as (
    select b.match_id, array_agg(b.seat::integer) as seats
    from public.match_players b
    where b.match_id in (select id from mp) and b.role in ('mafia', 'don')
    group by b.match_id
  ),
  g as (
    select mp.*, bl.seats as black_seats,
      (mp.role in ('civilian', 'sheriff') and coalesce(mp.win, false)) as red_win,
      -- Самострел: ночью мафия застрелила своего.
      exists (
        select 1 from jsonb_array_elements(coalesce(mp.log, '[]'::jsonb)) a
        where a ->> 't' = 'shot' and a ->> 'seat' is not null and (a ->> 'seat')::integer = any (bl.seats)
      ) as self_shot,
      -- За кого игрок голосовал за игру (поимённые голоса).
      (
        select coalesce(array_agg(distinct v.key::integer), '{}')
        from jsonb_array_elements(coalesce(mp.log, '[]'::jsonb)) a,
             jsonb_each(coalesce(a -> 'voters', '{}'::jsonb)) v
        where a ->> 't' = 'vote' and v.value @> to_jsonb(mp.seat)
      ) as voted
    from mp left join blacks bl on bl.match_id = mp.id
  ),
  red_runs as (
    select red_win,
      row_number() over (order by finished_at) - row_number() over (partition by red_win order by finished_at) as grp
    from g
  ),
  evenings as (
    -- Мини-турниры клуба (вечера по расписанию, не финалы), где игрок сыграл хотя бы одну рейтинговую игру.
    select ga.id, ga.starts_at,
      exists (select 1 from public.evening_standings(ga.id) st where st.place = 1 and st.profile_id = p_profile) as won,
      (select count(distinct mt.table_no) from public.matches mt where mt.game_id = ga.id and mt.status = 'finished' and mt.rated) as tables
    from public.games ga
    where ga.schedule_id is not null and ga.final_rating_id is null
      and exists (
        select 1 from public.matches mt join public.match_players x on x.match_id = mt.id
        where mt.game_id = ga.id and mt.status = 'finished' and mt.rated and x.profile_id = p_profile
      )
  ),
  evening_runs as (
    select won, row_number() over (order by starts_at) - row_number() over (partition by won order by starts_at) as grp
    from evenings
  )
  select jsonb_build_object(
    'site_games', (select count(*) from g),
    'red_streak', coalesce((select max(c) from (select count(*) as c from red_runs where red_win group by grp) s), 0),
    'full_best_move', (select count(*) from g
      where first_killed and black_seats is not null and best_move is not null
        and (select count(*) from unnest(best_move) b where b = any (black_seats)) = 3),
    'self_shot_wins', (select count(*) from g where self_shot and win and role in ('mafia', 'don')),
    'voted_all_blacks', (select count(*) from g
      where role in ('civilian', 'sheriff') and black_seats is not null and cardinality(black_seats) >= 2 and black_seats <@ voted),
    'evening_wins', (select count(*) from evenings where won),
    'evening_streak', coalesce((select max(c) from (select count(*) as c from evening_runs where won group by grp) s), 0),
    'evening_wins_2tables', (select count(*) from evenings where won and tables >= 2),
    'referrals', (select count(*) from public.respect_ledger where profile_id = p_profile and reason = 'referral'),
    'sheriff_wins', (select count(*) from g where role = 'sheriff' and win),
    'don_wins', (select count(*) from g where role = 'don' and win),
    'mafia_wins', (select count(*) from g where role in ('mafia', 'don') and win),
    'red_wins', (select count(*) from g where red_win),
    'club_podiums', (select count(*) from public.tournament_podiums where profile_id = p_profile and status = 'approved'),
    'club_wins', (select count(*) from public.tournament_podiums where profile_id = p_profile and status = 'approved' and place = 1)
  );
$$;
revoke execute on function public.player_achievement_facts(uuid) from public;
grant execute on function public.player_achievement_facts(uuid) to anon, authenticated, service_role;

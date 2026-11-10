-- Итоги вечера (мини-турнира): сумма баллов игрока за все партии вечера.
-- Порядок: баллы, затем победы, затем лучший ход. Гости учитываются по нику из бланка.
create or replace function public.evening_standings(p_game_id bigint)
returns table (place integer, profile_id uuid, name text, nickname text, avatar_url text, games integer, wins integer, points numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with s as (
    select mp.profile_id, min(mp.name) as name, count(*)::integer as games,
           count(*) filter (where mp.win)::integer as wins, sum(mp.points) as points, sum(mp.best_move_points) as bm
    from public.matches m join public.match_players mp on mp.match_id = m.id
    where m.game_id = p_game_id and m.status = 'finished' and m.rated
    group by mp.profile_id, case when mp.profile_id is null then mp.name end
  )
  select (rank() over (order by s.points desc, s.wins desc, s.bm desc))::integer,
         s.profile_id, s.name, pr.nickname, pr.avatar_url, s.games, s.wins, s.points
  from s left join public.profiles pr on pr.id = s.profile_id
  order by 1, s.name
$$;
grant execute on function public.evening_standings(bigint) to anon, authenticated;

-- Победители вечеров рейтинга (без финала), новые сверху. При полном равенстве — несколько победителей.
create or replace function public.evening_winners(p_rating_id bigint)
returns table (game_id bigint, starts_at timestamptz, game_number integer, title jsonb, profile_id uuid, name text, nickname text, avatar_url text, games integer, wins integer, points numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with r as (
    select sr.schedule_id, s.club_id, s.starts_on, s.ends_on
    from public.season_ratings sr join public.seasons s on s.id = sr.season_id where sr.id = p_rating_id
  ),
  ev as (
    select g.id, g.starts_at, g.number, g.title
    from r
    join public.games g on g.club_id = r.club_id and g.schedule_id = r.schedule_id and g.final_rating_id is null
    join public.clubs c on c.id = g.club_id
    join public.cities ci on ci.id = c.city_id
    where (g.starts_at at time zone ci.timezone)::date between r.starts_on and r.ends_on
      and exists (select 1 from public.matches m where m.game_id = g.id and m.status = 'finished' and m.rated)
  )
  select ev.id, ev.starts_at, ev.number, ev.title, st.profile_id, st.name, st.nickname, st.avatar_url, st.games, st.wins, st.points
  from ev cross join lateral public.evening_standings(ev.id) st
  where st.place = 1
  order by ev.starts_at desc
$$;
grant execute on function public.evening_winners(bigint) to anon, authenticated;

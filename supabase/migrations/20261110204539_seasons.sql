-- Сезоны и рейтинги клуба по регламенту (параллельные рейтинги: Premier League, MafiaCl Arena...).
--   formula 'sum'     — сумма баллов;
--   formula 'winrate' — (баллы за победы) × процент побед + допы + лучший ход − штрафы (MafiaCl Arena).
--   min_share — доля игр сезона этого рейтинга, которую нужно сыграть, чтобы попасть в зачёт.
--   Финал — отдельный вечер с games.final_rating_id; его партии идут с коэффициентом final_coef.

create table public.seasons (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  number smallint not null check (number > 0),
  name text not null check (char_length(name) between 1 and 60),
  starts_on date not null,
  ends_on date not null,
  constraint seasons_dates check (ends_on >= starts_on),
  constraint seasons_number_key unique (club_id, number)
);

create table public.season_ratings (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons (id) on delete cascade,
  schedule_id bigint references public.game_schedules (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  formula text not null default 'sum' check (formula in ('sum', 'winrate')),
  min_share numeric(4, 3) not null default 0 check (min_share between 0 and 1),
  final_coef numeric(3, 2) not null default 1 check (final_coef between 1 and 5),
  final_size smallint check (final_size between 2 and 30),
  final_on date,
  prize_per_game integer check (prize_per_game >= 0),        -- Kč за каждую сыгранную партию
  prize_per_evening integer check (prize_per_evening >= 0),  -- Kč за каждый мини-турнир (вечер)
  sort_order smallint not null default 0
);
create index season_ratings_season_idx on public.season_ratings (season_id);
create index season_ratings_schedule_idx on public.season_ratings (schedule_id);

alter table public.games add column final_rating_id bigint references public.season_ratings (id) on delete set null;
create index games_final_rating_idx on public.games (final_rating_id);
grant update (final_rating_id) on public.games to authenticated;

alter table public.seasons enable row level security;
alter table public.season_ratings enable row level security;
create policy "seasons are public" on public.seasons for select to anon, authenticated using (true);
create policy "admins manage seasons" on public.seasons for all to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "season ratings are public" on public.season_ratings for select to anon, authenticated using (true);
create policy "admins manage season ratings" on public.season_ratings for all to authenticated
  using (exists (select 1 from public.seasons s where s.id = season_id and (select private.has_club_role(s.club_id, array['owner', 'admin']))))
  with check (exists (select 1 from public.seasons s where s.id = season_id and (select private.has_club_role(s.club_id, array['owner', 'admin']))));
grant select on public.seasons, public.season_ratings to anon, authenticated;
grant insert, update, delete on public.seasons, public.season_ratings to authenticated;
grant all on public.seasons, public.season_ratings to service_role;

-- Таблица рейтинга (под RLS: видны только сыгранные партии).
create or replace function public.season_rating(p_rating_id bigint)
returns table (
  profile_id uuid,
  nickname text,
  avatar_url text,
  games integer,
  wins integer,
  finals integer,
  rating numeric,
  points numeric,
  base_points numeric,
  extra numeric,
  penalty numeric,
  best_move numeric,
  sheriff_games integer,
  sheriff_wins integer,
  black_games integer,
  black_wins integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with r as (
    select sr.*, s.club_id, s.starts_on, s.ends_on
    from public.season_ratings sr join public.seasons s on s.id = sr.season_id
    where sr.id = p_rating_id
  ),
  mm as (
    select m.id, coalesce(g.final_rating_id = r.id, false) as is_final,
           case when g.final_rating_id = r.id then r.final_coef else 1 end as w
    from r
    join public.matches m on m.club_id = r.club_id
    join public.clubs c on c.id = m.club_id
    join public.cities ci on ci.id = c.city_id
    left join public.games g on g.id = m.game_id
    where m.status = 'finished' and m.rated
      and (coalesce(g.starts_at, m.finished_at) at time zone ci.timezone)::date between r.starts_on and r.ends_on
      and (g.final_rating_id = r.id or (g.final_rating_id is null and (r.schedule_id is null or g.schedule_id = r.schedule_id)))
  ),
  agg as (
    select
      mp.profile_id,
      count(*) filter (where not mm.is_final)::integer as games,
      count(*) filter (where mp.win)::integer as wins,
      count(*) filter (where mm.is_final)::integer as finals,
      sum(mp.points * mm.w) as points,
      sum((mp.points - mp.extra + mp.penalty - mp.best_move_points) * mm.w) as base_points,
      sum(mp.extra * mm.w) as extra,
      sum(mp.penalty * mm.w) as penalty,
      sum(mp.best_move_points * mm.w) as best_move,
      count(*) filter (where mp.role = 'sheriff')::integer as sheriff_games,
      count(*) filter (where mp.role = 'sheriff' and mp.win)::integer as sheriff_wins,
      count(*) filter (where mp.role in ('mafia', 'don'))::integer as black_games,
      count(*) filter (where mp.role in ('mafia', 'don') and mp.win)::integer as black_wins,
      count(*)::integer as all_games
    from mm join public.match_players mp on mp.match_id = mm.id
    where mp.profile_id is not null
    group by mp.profile_id
  )
  select
    a.profile_id, pr.nickname, pr.avatar_url, a.games, a.wins, a.finals,
    round(case when (select formula from r) = 'winrate'
      then a.base_points * a.wins::numeric / nullif(a.all_games, 0) + a.extra + a.best_move - a.penalty
      else a.points end, 2),
    a.points, a.base_points, a.extra, a.penalty, a.best_move,
    a.sheriff_games, a.sheriff_wins, a.black_games, a.black_wins
  from agg a join public.profiles pr on pr.id = a.profile_id
$$;
grant execute on function public.season_rating(bigint) to anon, authenticated;

-- Сколько партий и вечеров сыграно в рейтинге (для порога «20 % игр» и призового фонда). Финал не считается.
create or replace function public.season_rating_totals(p_rating_id bigint)
returns table (matches integer, evenings integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(distinct m.id)::integer, count(distinct m.game_id)::integer
  from public.season_ratings sr
  join public.seasons s on s.id = sr.season_id
  join public.matches m on m.club_id = s.club_id
  join public.clubs c on c.id = m.club_id
  join public.cities ci on ci.id = c.city_id
  left join public.games g on g.id = m.game_id
  where sr.id = p_rating_id
    and m.status = 'finished' and m.rated
    and g.final_rating_id is null
    and (sr.schedule_id is null or g.schedule_id = sr.schedule_id)
    and (coalesce(g.starts_at, m.finished_at) at time zone ci.timezone)::date between s.starts_on and s.ends_on
$$;
grant execute on function public.season_rating_totals(bigint) to anon, authenticated;

-- V сезон MafiaCL Prague: Premier League (вторник) и MafiaCl Arena (воскресенье).
with c as (select id from public.clubs where slug = 'mafiacl-prague'),
s as (
  insert into public.seasons (club_id, number, name, starts_on, ends_on)
  select c.id, 5, 'V сезон', date '2026-02-01', date '2026-12-31' from c
  returning id, club_id
)
insert into public.season_ratings (season_id, schedule_id, name, formula, min_share, final_coef, final_size, final_on, prize_per_game, prize_per_evening, sort_order)
select s.id, gs.id, x.name, x.formula, x.min_share, x.coef, x.size, x.final_on, x.ppg, x.ppe, x.ord
from s
join (values
  (2, 'Premier League', 'sum', 0.2, 1.5, 10, date '2026-12-15', 20, 50, 1),
  (7, 'MafiaCl Arena', 'winrate', 0.0, 1.0, null::smallint, null::date, null::integer, null::integer, 2)
) as x (weekday, name, formula, min_share, coef, size, final_on, ppg, ppe, ord) on true
join public.game_schedules gs on gs.club_id = s.club_id and gs.weekday = x.weekday;

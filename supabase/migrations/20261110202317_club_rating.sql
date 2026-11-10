-- Рейтинг клуба за период: сумма баллов рейтинговых сыгранных партий по игрокам с аккаунтом.
-- security invoker — работает под RLS: видны только сыгранные партии (их итог публичный).
create or replace function public.club_rating(
  p_club_slug text,
  p_from date,
  p_to date,
  p_schedule_id bigint default null
)
returns table (
  profile_id uuid,
  nickname text,
  avatar_url text,
  games integer,
  wins integer,
  points numeric,
  best_move_points numeric,
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
  select
    pr.id,
    pr.nickname,
    pr.avatar_url,
    count(*)::integer,
    count(*) filter (where mp.win)::integer,
    sum(mp.points),
    sum(mp.best_move_points),
    count(*) filter (where mp.role = 'sheriff')::integer,
    count(*) filter (where mp.role = 'sheriff' and mp.win)::integer,
    count(*) filter (where mp.role in ('mafia', 'don'))::integer,
    count(*) filter (where mp.role in ('mafia', 'don') and mp.win)::integer
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  join public.clubs c on c.id = m.club_id
  join public.cities ci on ci.id = c.city_id
  join public.profiles pr on pr.id = mp.profile_id
  left join public.games g on g.id = m.game_id
  where c.slug = p_club_slug
    and m.status = 'finished'
    and m.rated
    and (coalesce(g.starts_at, m.finished_at) at time zone ci.timezone)::date between p_from and p_to
    and (p_schedule_id is null or g.schedule_id = p_schedule_id)
  group by pr.id, pr.nickname, pr.avatar_url
$$;
grant execute on function public.club_rating(text, date, date, bigint) to anon, authenticated;

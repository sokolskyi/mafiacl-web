-- Нумерация серий: «Мини-турнир XXXVIII», «MafiaCL Arena Round 19».
-- В названии шаблона {n} — место для номера; стиль номера — римский или арабский.
-- Ссылка на страницу игры во внешней системе (mafgame.org и т. п.).

alter table public.game_schedules
  add column next_number integer check (next_number > 0),
  add column number_style text not null default 'arabic' check (number_style in ('arabic', 'roman'));

alter table public.games
  add column number integer check (number > 0),
  add column info_url text check (info_url is null or info_url ~ '^https://');

grant update (next_number, number_style) on public.game_schedules to authenticated;
grant insert (next_number, number_style) on public.game_schedules to authenticated;
grant update (number, info_url) on public.games to authenticated;
grant insert (number, info_url) on public.games to authenticated;

-- Генератор теперь выдаёт номера по порядку дат и сдвигает счётчик шаблона.
create or replace function private.generate_scheduled_games(p_weeks integer default 3)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created integer;
begin
  with slots as (
    select
      s.id as schedule_id,
      ((d.day + s.start_time) at time zone ci.timezone) as starts_at
    from public.game_schedules s
    join public.clubs c on c.id = s.club_id
    join public.cities ci on ci.id = c.city_id
    cross join lateral (
      select g::date as day
      from generate_series(
        (now() at time zone ci.timezone)::date,
        (now() at time zone ci.timezone)::date + least(greatest(p_weeks, 1), 8) * 7,
        interval '1 day'
      ) g
    ) d
    where s.is_active
      and extract(isodow from d.day) = s.weekday
  ),
  missing as (
    select sl.*, row_number() over (partition by sl.schedule_id order by sl.starts_at) as rn
    from slots sl
    where sl.starts_at > now()
      and not exists (
        select 1 from public.games g where g.schedule_id = sl.schedule_id and g.starts_at = sl.starts_at
      )
  ),
  inserted as (
    insert into public.games
      (club_id, venue_id, schedule_id, title, kind, status, capacity, price_czk, starts_at, late_after, number)
    select
      s.club_id, s.venue_id, s.id, s.title, s.kind, 'open', s.capacity, s.price_czk, m.starts_at,
      case when s.late_after_minutes is not null then m.starts_at + make_interval(mins => s.late_after_minutes) end,
      case when s.next_number is not null then s.next_number + m.rn - 1 end
    from missing m
    join public.game_schedules s on s.id = m.schedule_id
    on conflict (schedule_id, starts_at) do nothing
    returning schedule_id
  ),
  bumped as (
    update public.game_schedules s
    set next_number = s.next_number + i.cnt
    from (select schedule_id, count(*) as cnt from inserted group by schedule_id) i
    where s.id = i.schedule_id and s.next_number is not null
    returning s.id
  )
  select count(*) into v_created from inserted;
  return v_created;
end;
$$;
revoke execute on function private.generate_scheduled_games(integer) from public, anon, authenticated;

-- Шаблоны MafiaCL Prague: названия с {n}, стоимость и места.
update public.game_schedules s
set title = '{"cs": "Mini-turnaj {n}", "ru": "Мини-турнир {n}", "uk": "Міні-турнір {n}", "en": "Mini tournament {n}"}',
    number_style = 'roman',
    capacity = 20
from public.clubs c
where c.id = s.club_id and c.slug = 'mafiacl-prague' and s.weekday = 2;

update public.game_schedules s
set title = '{"cs": "MafiaCL Arena Round {n}", "ru": "MafiaCL Arena Round {n}", "uk": "MafiaCL Arena Round {n}", "en": "MafiaCL Arena Round {n}"}',
    kind = 'tournament',
    price_czk = 300
from public.clubs c
where c.id = s.club_id and c.slug = 'mafiacl-prague' and s.weekday = 7;

-- Уже созданные игры: номера по порядку (мини-турнир 10.11 — XXXVIII, Arena 15.11 — Round 19).
with numbered as (
  select g.id,
         s.weekday,
         row_number() over (partition by g.schedule_id order by g.starts_at) as rn
  from public.games g
  join public.game_schedules s on s.id = g.schedule_id
  join public.clubs c on c.id = s.club_id
  where c.slug = 'mafiacl-prague'
)
update public.games g
set number = case n.weekday when 2 then 37 + n.rn when 7 then 18 + n.rn end,
    title = s.title,
    kind = s.kind,
    capacity = s.capacity,
    price_czk = s.price_czk
from numbered n
join public.games g2 on g2.id = n.id
join public.game_schedules s on s.id = g2.schedule_id
where g.id = n.id;

update public.game_schedules s
set next_number = coalesce((select max(g.number) from public.games g where g.schedule_id = s.id), 0) + 1
from public.clubs c
where c.id = s.club_id and c.slug = 'mafiacl-prague';

-- Arena Round 19 на mafgame.org
update public.games g
set info_url = 'https://mafgame.org/tournaments/1045/view'
from public.game_schedules s
where s.id = g.schedule_id and s.weekday = 7 and g.number = 19;

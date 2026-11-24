-- Окно предзаписи: «полночь за N дней до игры». Генератор ставил на сутки позже
-- (для вторника — вторник 00:00 вместо понедельника 00:00, то есть позже финала пн 19:00
-- и позже обещанного «подтверждение — в понедельник»). Исправляем формулу и уже созданные игры.

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
      d.day,
      ci.timezone,
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
      (club_id, venue_id, schedule_id, title, kind, status, capacity, price_czk, starts_at, late_after, number,
       priority_until, final_at, table_size, max_capacity)
    select
      s.club_id, s.venue_id, s.id, s.title, s.kind, 'open',
      coalesce(s.table_size, s.capacity), s.price_czk, m.starts_at,
      case when s.late_after_minutes is not null then m.starts_at + make_interval(mins => s.late_after_minutes) end,
      case when s.next_number is not null then s.next_number + m.rn - 1 end,
      case when s.priority_cutoff_days is not null
        then ((m.day - s.priority_cutoff_days)::timestamp) at time zone m.timezone end,
      case when s.final_time is not null
        then ((m.day - coalesce(s.final_days_before, 0)) + s.final_time) at time zone m.timezone end,
      s.table_size,
      case when s.table_size is not null then coalesce(s.max_capacity, s.capacity) end
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

update public.games g
set priority_until = ((g.starts_at at time zone ci.timezone)::date - s.priority_cutoff_days)::timestamp at time zone ci.timezone
from public.game_schedules s, public.clubs c, public.cities ci
where s.id = g.schedule_id and s.priority_cutoff_days is not null
  and c.id = g.club_id and ci.id = c.city_id
  and g.allocated_at is null
  and g.starts_at > now()
  and ((g.starts_at at time zone ci.timezone)::date - s.priority_cutoff_days)::timestamp at time zone ci.timezone > now()
  and g.priority_until is distinct from
      ((g.starts_at at time zone ci.timezone)::date - s.priority_cutoff_days)::timestamp at time zone ci.timezone;

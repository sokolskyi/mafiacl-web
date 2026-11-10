-- Еженедельное расписание клуба, автосоздание игр на 3 недели вперёд,
-- лист ожидания с автоматическим переводом в основной состав.
-- Также: клуб называется «MafiaCL Prague», город в адресах — prague.

-- ---------------------------------------------------------------------------
-- Название клуба
-- ---------------------------------------------------------------------------
update public.clubs set name = 'MafiaCL Prague', slug = 'mafiacl-prague' where slug = 'mafiacl-praha';
update public.cities set slug = 'prague' where slug = 'praha';

-- ---------------------------------------------------------------------------
-- Шаблоны регулярных игр: «каждый вторник 18:45, мини-турнир, Aura»
-- ---------------------------------------------------------------------------
create table public.game_schedules (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  venue_id bigint references public.venues (id) on delete set null,
  title jsonb not null check (jsonb_typeof(title) = 'object'),   -- {"cs": "...", "ru": "...", ...}
  kind text not null default 'rating' check (kind in ('rating', 'fun', 'tournament', 'corporate', 'kids')),
  weekday smallint not null check (weekday between 1 and 7),     -- ISO: 1 = понедельник, 7 = воскресенье
  start_time time not null,                                       -- местное время города клуба
  late_after_minutes smallint check (late_after_minutes between 0 and 180),
  capacity smallint not null default 10 check (capacity between 1 and 40),
  price_czk numeric(10, 2) check (price_czk >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index game_schedules_club_id_idx on public.game_schedules (club_id);
create index game_schedules_venue_id_idx on public.game_schedules (venue_id);
create trigger game_schedules_set_updated_at before update on public.game_schedules
  for each row execute function private.set_updated_at();

alter table public.games
  add column schedule_id bigint references public.game_schedules (id) on delete set null,
  add column title jsonb check (title is null or jsonb_typeof(title) = 'object'),
  add column late_after timestamptz,
  add column stream_url text check (stream_url is null or stream_url ~ '^https://');
-- Одна игра на один слот расписания (повторный запуск генератора ничего не дублирует).
create unique index games_schedule_slot_key on public.games (schedule_id, starts_at);

-- ---------------------------------------------------------------------------
-- Генератор: создаёт открытые игры по активным шаблонам на p_weeks недель вперёд.
-- ---------------------------------------------------------------------------
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
      s.*,
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
  )
  insert into public.games (club_id, venue_id, schedule_id, title, kind, status, capacity, price_czk, starts_at, late_after)
  select
    club_id, venue_id, id, title, kind, 'open', capacity, price_czk, starts_at,
    case when late_after_minutes is not null then starts_at + make_interval(mins => late_after_minutes) end
  from slots
  where starts_at > now()
  on conflict (schedule_id, starts_at) do nothing;

  get diagnostics v_created = row_count;
  return v_created;
end;
$$;
revoke execute on function private.generate_scheduled_games(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Лист ожидания: когда игрок из основного состава отменяет запись,
-- первый из листа ожидания переходит в основной состав.
-- ---------------------------------------------------------------------------
create or replace function private.signup_promote_waitlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'confirmed' and new.status = 'cancelled' then
    update public.game_signups s
    set status = 'confirmed'
    where s.id = (
      select w.id from public.game_signups w
      where w.game_id = new.game_id and w.status = 'waitlist'
      order by w.created_at, w.id
      limit 1
      for update skip locked
    );
  end if;
  return null;
end;
$$;
revoke execute on function private.signup_promote_waitlist() from public, anon, authenticated;

create trigger game_signups_promote_waitlist
  after update of status on public.game_signups
  for each row execute function private.signup_promote_waitlist();

-- ---------------------------------------------------------------------------
-- RLS и права
-- ---------------------------------------------------------------------------
alter table public.game_schedules enable row level security;

create policy "active schedules are public" on public.game_schedules for select to anon, authenticated
  using (is_active);
create policy "admins manage schedules" on public.game_schedules for all to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select on public.game_schedules to anon, authenticated;
grant insert (club_id, venue_id, title, kind, weekday, start_time, late_after_minutes, capacity, price_czk, is_active),
      update (venue_id, title, kind, weekday, start_time, late_after_minutes, capacity, price_czk, is_active),
      delete on public.game_schedules to authenticated;
grant update (title, late_after, stream_url) on public.games to authenticated;
grant insert (title, late_after, stream_url, schedule_id) on public.games to authenticated;

-- ---------------------------------------------------------------------------
-- Площадки и расписание MafiaCL Prague
-- ---------------------------------------------------------------------------
insert into public.venues (club_id, name, address, maps_url)
select c.id, v.name, v.address, v.maps_url
from public.clubs c
cross join (values
  ('Aura Shisha & Karaoke', 'Cimburkova 402/10, 130 00 Praha 3 – Žižkov',
   'https://www.google.com/maps/search/?api=1&query=Aura+Shisha+Karaoke+Cimburkova+10+Praha'),
  ('POP PAUSE Popcorn Café', 'Panská 897/12, 110 00 Praha 1 – Nové Město',
   'https://www.google.com/maps/search/?api=1&query=POP+PAUSE+Pansk%C3%A1+12+Praha')
) as v (name, address, maps_url)
where c.slug = 'mafiacl-prague';

insert into public.game_schedules (club_id, venue_id, title, kind, weekday, start_time, late_after_minutes)
select c.id, v.id, s.title::jsonb, s.kind, s.weekday, s.start_time::time, s.late
from public.clubs c
join (values
  ('Aura Shisha & Karaoke',
   '{"cs": "Mini-turnaj", "ru": "Мини-турнир", "uk": "Міні-турнір", "en": "Mini tournament"}',
   'tournament', 2, '18:45', 15),
  ('POP PAUSE Popcorn Café',
   '{"cs": "MafiaCL Arena", "ru": "MafiaCL Arena", "uk": "MafiaCL Arena", "en": "MafiaCL Arena"}',
   'rating', 7, '14:00', null)
) as s (venue_name, title, kind, weekday, start_time, late) on true
join public.venues v on v.club_id = c.id and v.name = s.venue_name
where c.slug = 'mafiacl-prague';

select private.generate_scheduled_games(3);

-- Каждую ночь в 03:15 UTC досоздаём игры на 3 недели вперёд.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('generate-scheduled-games', '15 3 * * *', $$select private.generate_scheduled_games(3)$$);

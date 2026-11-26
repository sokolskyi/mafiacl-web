-- Открытка ко дню рождения: согласие на публичное поздравление, учёт отправленных поздравлений,
-- списки именинников (для утреннего бота и значка 🎂 у ника), ежедневный будильник.

-- Согласие игрока: клуб может поздравить публично (пост в канале, значок 🎂 у ника на неделю).
alter table public.profile_private add column birthday_public boolean not null default false;
grant select (birthday_public), update (birthday_public) on public.profile_private to authenticated;

-- Что уже отправлено в этом году: личное сообщение бота и пост в канале (по одному разу).
create table public.birthday_greetings (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  year integer not null check (year between 2026 and 2200),
  dm_sent_at timestamptz,
  channel_posted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (profile_id, year)
);
alter table public.birthday_greetings enable row level security;
-- Только сервер (service_role); игрокам и гостям не нужна.

-- День рождения в данном году (29 февраля в невисокосный год — 28 февраля).
create or replace function private.birthday_in_year(p_bd date, p_year integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(p_year, extract(month from p_bd)::integer,
    least(extract(day from p_bd)::integer,
      extract(day from (make_date(p_year, extract(month from p_bd)::integer, 1) + interval '1 month - 1 day'))::integer));
$$;

-- Именинники сегодня (Прага) — для утреннего поздравления. Только сервер.
create or replace function public.birthdays_today()
returns table (profile_id uuid, nickname text, locale text, telegram_chat_id bigint, birthday_public boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nickname, p.locale, pp.telegram_chat_id, pp.birthday_public
  from public.profile_private pp
  join public.profiles p on p.id = pp.profile_id
  where p.verification = 'approved'
    and p.nickname is not null
    and pp.birthday is not null
    and private.birthday_in_year(pp.birthday, extract(year from (now() at time zone 'Europe/Prague'))::integer)
      = (now() at time zone 'Europe/Prague')::date;
$$;
revoke execute on function public.birthdays_today() from public, anon, authenticated;
grant execute on function public.birthdays_today() to service_role;

-- Значок 🎂: игроки, согласившиеся на публичное поздравление, в течение недели с дня рождения.
-- Отдаёт только id аккаунтов — без дат.
create or replace function public.birthday_badges()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with d as (select (now() at time zone 'Europe/Prague')::date as today)
  select pp.profile_id
  from public.profile_private pp
  join public.profiles p on p.id = pp.profile_id, d
  where p.verification = 'approved'
    and pp.birthday_public
    and pp.birthday is not null
    and exists (
      select 1 from (values (extract(year from d.today)::integer), (extract(year from d.today)::integer - 1)) y (yr)
      where d.today between private.birthday_in_year(pp.birthday, y.yr) and private.birthday_in_year(pp.birthday, y.yr) + 6
    );
$$;
revoke execute on function public.birthday_badges() from public;
grant execute on function public.birthday_badges() to anon, authenticated, service_role;

-- Будильник: каждое утро POST api/cron/birthdays (8:07 по Праге зимой, 9:07 летом).
insert into private.app_settings (name, value)
values ('birthdays_url', 'https://mafiacl-web.vercel.app/api/cron/birthdays')
on conflict (name) do nothing;

create or replace function private.kick_birthdays()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := (select value from private.app_settings where name = 'birthdays_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from private.app_settings where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

select cron.schedule('birthday-greetings', '7 7 * * *', 'select private.kick_birthdays()');

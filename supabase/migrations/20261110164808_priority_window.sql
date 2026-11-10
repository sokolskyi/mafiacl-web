-- Приоритет абонементов на вторничные мини-турниры.
--   • До воскресенья 24:00 (по времени клуба) все записи — «в очереди».
--   • В полночь: сначала владельцы абонементов, потом остальные, по времени записи;
--     первые 10 — в составе (подтверждение в понедельник в 09:00), остальные — лист ожидания.
--   • Понедельник 19:00: если записалось 20+, открывается второй стол — состав 20.
--     Меньше 10 — владельцу и ведущим «стол не набрался» (отменяет вручную).
--   • Воскресная Arena — без приоритета: кто первый записался.

-- ---------------------------------------------------------------------------
-- Абонементы на срок: 1 месяц / 3 месяца (пока выдаёт владелец/админ; позже — покупка на сайте)
-- ---------------------------------------------------------------------------
create table public.memberships (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null default 'month' check (plan in ('month', 'quarter', 'custom')), -- 1 мес. / 3 мес. / особый
  valid_from date not null default current_date,
  valid_until date not null,
  note text check (char_length(note) <= 200),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint memberships_dates check (valid_until >= valid_from)
);
create index memberships_profile_club_idx on public.memberships (profile_id, club_id, valid_until);
create index memberships_club_id_idx on public.memberships (club_id);
create index memberships_created_by_idx on public.memberships (created_by);
alter table public.memberships enable row level security;

create policy "players see own memberships" on public.memberships for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "staff see club memberships" on public.memberships for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "admins manage memberships" on public.memberships for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins update memberships" on public.memberships for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins delete memberships" on public.memberships for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select on public.memberships to authenticated;
grant insert (club_id, profile_id, plan, valid_from, valid_until, note),
      update (plan, valid_from, valid_until, note),
      delete on public.memberships to authenticated;
grant all on public.memberships to service_role;

-- ---------------------------------------------------------------------------
-- Настройки шаблона и игры
-- ---------------------------------------------------------------------------
alter table public.game_schedules
  add column priority_cutoff_days smallint check (priority_cutoff_days between 1 and 14), -- полночь за N дней до игры
  add column final_days_before smallint check (final_days_before between 0 and 14),
  add column final_time time,                                                            -- «понедельник 19:00»
  add column table_size smallint check (table_size between 2 and 20),                    -- шаг столов (10)
  add column max_capacity smallint check (max_capacity between 1 and 40);

alter table public.games
  add column priority_until timestamptz,   -- до этого момента записи — в очереди
  add column allocated_at timestamptz,     -- очередь разобрана
  add column final_at timestamptz,         -- решение о числе столов
  add column finalized_at timestamptz,
  add column table_size smallint check (table_size between 2 and 20),
  add column max_capacity smallint check (max_capacity between 1 and 40);
create index games_priority_pending_idx on public.games (priority_until) where allocated_at is null and priority_until is not null;
create index games_final_pending_idx on public.games (final_at) where finalized_at is null and final_at is not null;

grant update (priority_until, final_at, table_size, max_capacity) on public.games to authenticated;

-- Отметка «был абонемент на момент разбора очереди» — порядок листа ожидания.
alter table public.game_signups add column has_priority boolean not null default false;

alter table public.game_signups drop constraint game_signups_status_check;
alter table public.game_signups
  add constraint game_signups_status_check check (status in ('queued', 'confirmed', 'waitlist', 'cancelled'));

-- Политика записи игрока: можно сразу «в очередь».
drop policy "players sign themselves up" on public.game_signups;
create policy "players sign themselves up" on public.game_signups for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and guest_name is null
    and status in ('queued', 'confirmed', 'waitlist')
    and exists (select 1 from public.games g where g.id = game_id and g.status = 'open')
  );

-- ---------------------------------------------------------------------------
-- Лимит стола с учётом окна приоритета
-- ---------------------------------------------------------------------------
create or replace function private.signup_apply_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity smallint;
  v_priority_until timestamptz;
  v_allocated timestamptz;
  v_taken integer;
begin
  if new.status not in ('confirmed', 'queued') then
    return new;
  end if;
  select g.capacity, g.priority_until, g.allocated_at
    into v_capacity, v_priority_until, v_allocated
  from public.games g where g.id = new.game_id for update;

  -- Окно приоритета открыто: новая запись встаёт в очередь. Ведущий может
  -- вручную перевести «в очереди» → «в составе» (это UPDATE, его не трогаем).
  if v_priority_until is not null and v_allocated is null and now() < v_priority_until
     and (tg_op = 'INSERT' or new.status = 'queued') then
    new.status := 'queued';
    return new;
  end if;
  if new.status = 'queued' then
    new.status := 'confirmed';
  end if;

  select count(*) into v_taken
  from public.game_signups s
  where s.game_id = new.game_id and s.status = 'confirmed' and s.id is distinct from new.id;
  if v_taken >= v_capacity then
    new.status := 'waitlist';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Очередь уведомлений: отложенная отправка и новые виды
-- ---------------------------------------------------------------------------
alter table public.notifications add column send_after timestamptz not null default now();
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('reminder', 'promoted', 'table_full', 'game_cancelled', 'confirmed', 'waitlisted', 'waitlist_final', 'not_enough'));
drop index public.notifications_pending_idx;
create index notifications_pending_idx on public.notifications (send_after) where sent_at is null;

-- Пока идёт разбор очереди/финал, «освободилось место» не шлём — придёт итоговое сообщение.
create or replace function private.notify_signup_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null and old.status = 'waitlist' and new.status = 'confirmed'
     and current_setting('mafiacl.bulk', true) is distinct from 'on' then
    insert into public.notifications (profile_id, game_id, kind)
    values (new.profile_id, new.game_id, 'promoted')
    on conflict do nothing;
  end if;
  return null;
end;
$$;

-- Лист ожидания: сначала владельцы абонементов, потом по времени записи.
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
      order by w.has_priority desc, w.created_at, w.id
      limit 1
      for update skip locked
    );
  end if;
  return null;
end;
$$;

-- «Стол собран» для игр с финалом шлём только после финала (его ставит finalize_tables).
create or replace function private.notify_table_full()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_club bigint;
  v_capacity smallint;
  v_confirmed integer;
begin
  if new.status <> 'confirmed' or current_setting('mafiacl.bulk', true) = 'on' then
    return null;
  end if;
  select g.club_id, g.capacity into v_club, v_capacity
  from public.games g
  where g.id = new.game_id and (g.final_at is null or g.finalized_at is not null);
  if not found then
    return null;
  end if;
  select count(*) into v_confirmed from public.game_signups s where s.game_id = new.game_id and s.status = 'confirmed';
  if v_confirmed >= v_capacity then
    insert into public.notifications (profile_id, game_id, kind)
    select distinct s.profile_id, new.game_id, 'table_full'
    from public.club_staff s
    where s.club_id = v_club and s.role in ('owner', 'admin', 'host')
    on conflict do nothing;
  end if;
  return null;
end;
$$;

-- Отмена игры — всем, включая тех, кто ещё в очереди.
create or replace function private.notify_game_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    insert into public.notifications (profile_id, game_id, kind)
    select s.profile_id, new.id, 'game_cancelled'
    from public.game_signups s
    where s.game_id = new.id and s.profile_id is not null and s.status in ('queued', 'confirmed', 'waitlist')
    on conflict do nothing;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Полночь: разобрать очередь (абонементы → время записи)
-- ---------------------------------------------------------------------------
create or replace function private.allocate_priority_queues()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  v_done integer := 0;
  v_send timestamptz;
begin
  perform set_config('mafiacl.bulk', 'on', true);
  for g in
    select gm.id, gm.club_id, gm.capacity, gm.table_size, gm.priority_until, ci.timezone,
           (gm.starts_at at time zone ci.timezone)::date as game_day
    from public.games gm
    join public.clubs c on c.id = gm.club_id
    join public.cities ci on ci.id = c.city_id
    where gm.priority_until <= now() and gm.allocated_at is null
    for update of gm skip locked
  loop
    update public.game_signups s
    set has_priority = exists (
      select 1 from public.memberships m
      where m.profile_id = s.profile_id and m.club_id = g.club_id
        and g.game_day between m.valid_from and m.valid_until
    )
    where s.game_id = g.id and s.status = 'queued';

    update public.games set allocated_at = now() where id = g.id;

    with ranked as (
      select s.id, row_number() over (order by s.has_priority desc, s.created_at, s.id) as rn
      from public.game_signups s
      where s.game_id = g.id and s.status = 'queued'
    )
    update public.game_signups s
    set status = case
      when r.rn <= g.capacity - (select count(*) from public.game_signups c where c.game_id = g.id and c.status = 'confirmed')
        then 'confirmed' else 'waitlist' end
    from ranked r
    where s.id = r.id;

    -- Набрался хотя бы один стол → утром (09:00 по времени клуба) подтверждение
    -- составу и «вы в листе ожидания» остальным. Иначе ждём финала в понедельник.
    if (select count(*) from public.game_signups s where s.game_id = g.id and s.status in ('confirmed', 'waitlist'))
       >= coalesce(g.table_size, 1) then
      v_send := greatest((g.priority_until at time zone g.timezone)::date + time '09:00', now() at time zone g.timezone)
                at time zone g.timezone;
      insert into public.notifications (profile_id, game_id, kind, send_after)
      select s.profile_id, g.id, case s.status when 'confirmed' then 'confirmed' else 'waitlisted' end, v_send
      from public.game_signups s
      where s.game_id = g.id and s.profile_id is not null and s.status in ('confirmed', 'waitlist')
      on conflict do nothing;
    end if;

    v_done := v_done + 1;
  end loop;
  perform set_config('mafiacl.bulk', 'off', true);
  return v_done;
end;
$$;
revoke execute on function private.allocate_priority_queues() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Понедельник 19:00: решить, один стол или два
-- ---------------------------------------------------------------------------
create or replace function private.finalize_tables()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  v_total integer;
  v_capacity integer;
  v_done integer := 0;
begin
  perform set_config('mafiacl.bulk', 'on', true);
  for g in
    select gm.id, gm.club_id, gm.capacity, gm.table_size, gm.max_capacity
    from public.games gm
    where gm.final_at <= now() and gm.finalized_at is null and gm.status = 'open'
      and (gm.priority_until is null or gm.allocated_at is not null)
    for update skip locked
  loop
    select count(*) into v_total
    from public.game_signups s where s.game_id = g.id and s.status in ('confirmed', 'waitlist');

    -- Столы по table_size: 10–19 → 10 мест, 20+ → 20 (не больше max_capacity).
    if g.table_size is not null and g.max_capacity is not null then
      v_capacity := greatest(g.table_size, least(g.max_capacity, (v_total / g.table_size) * g.table_size));
    else
      v_capacity := g.capacity;
    end if;
    update public.games set capacity = v_capacity, finalized_at = now() where id = g.id;

    with promote as (
      select s.id
      from public.game_signups s
      where s.game_id = g.id and s.status = 'waitlist'
      order by s.has_priority desc, s.created_at, s.id
      limit greatest(v_capacity - (select count(*) from public.game_signups c where c.game_id = g.id and c.status = 'confirmed'), 0)
    )
    update public.game_signups s set status = 'confirmed'
    from promote p where s.id = p.id;

    if v_total >= coalesce(g.table_size, 1) then
      -- Итог: состав (кому подтверждение уже ушло утром — повторно не шлём) и лист ожидания.
      insert into public.notifications (profile_id, game_id, kind)
      select s.profile_id, g.id, case s.status when 'confirmed' then 'confirmed' else 'waitlist_final' end
      from public.game_signups s
      where s.game_id = g.id and s.profile_id is not null and s.status in ('confirmed', 'waitlist')
      on conflict do nothing;
      -- Черновик поста со списком состава — владельцу и ведущим.
      insert into public.notifications (profile_id, game_id, kind)
      select distinct st.profile_id, g.id, 'table_full'
      from public.club_staff st
      where st.club_id = g.club_id and st.role in ('owner', 'admin', 'host')
      on conflict do nothing;
    else
      -- Стол не набрался: решает владелец (отмена в админке разошлёт всем «игра отменена»).
      insert into public.notifications (profile_id, game_id, kind)
      select distinct st.profile_id, g.id, 'not_enough'
      from public.club_staff st
      where st.club_id = g.club_id and st.role in ('owner', 'admin', 'host')
      on conflict do nothing;
    end if;
    v_done := v_done + 1;
  end loop;
  perform set_config('mafiacl.bulk', 'off', true);
  return v_done;
end;
$$;
revoke execute on function private.finalize_tables() from public, anon, authenticated;

-- Будильник каждые 5 минут: очередь → финал → напоминания → рассылка.
create or replace function private.kick_telegram_dispatch()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.allocate_priority_queues();
  perform private.finalize_tables();
  perform private.enqueue_reminders();
  if exists (select 1 from public.notifications where sent_at is null and attempts < 5 and send_after <= now()) then
    perform net.http_post(
      url := (select value from private.app_settings where name = 'dispatch_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select value from private.app_settings where name = 'cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Генератор: переносит настройки окна и столов из шаблона в игру
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
        then ((m.day - s.priority_cutoff_days + 1)::timestamp) at time zone m.timezone end,
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

-- ---------------------------------------------------------------------------
-- Вторник MafiaCL Prague: очередь до вс 24:00, финал пн 19:00, столы по 10, максимум 20
-- (priority_cutoff_days = 1 → полночь в начале понедельника, т. е. «воскресенье 24:00»)
-- Воскресная Arena не трогается: кто первый записался.
-- ---------------------------------------------------------------------------
update public.game_schedules s
set priority_cutoff_days = 1, final_days_before = 1, final_time = '19:00',
    table_size = 10, max_capacity = 20
from public.clubs c
where c.id = s.club_id and c.slug = 'mafiacl-prague' and s.weekday = 2;

-- Уже созданные вторники (кроме сегодняшнего и прошедших).
update public.games g
set capacity = 10, table_size = 10, max_capacity = 20,
    priority_until = ((g.starts_at at time zone ci.timezone)::date - 1)::timestamp at time zone ci.timezone,
    final_at = (((g.starts_at at time zone ci.timezone)::date - 1) + time '19:00') at time zone ci.timezone
from public.game_schedules s, public.clubs c, public.cities ci
where s.id = g.schedule_id and s.weekday = 2 and c.id = g.club_id and ci.id = c.city_id
  and c.slug = 'mafiacl-prague'
  and ((g.starts_at at time zone ci.timezone)::date - 1)::timestamp at time zone ci.timezone > now();

-- Кто уже записался на эти вторники — тоже в очередь (порядок по времени записи сохранится).
update public.game_signups s
set status = 'queued'
from public.games g
where g.id = s.game_id and g.priority_until > now() and g.allocated_at is null
  and s.status in ('confirmed', 'waitlist');

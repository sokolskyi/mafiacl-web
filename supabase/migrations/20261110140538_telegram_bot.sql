-- Telegram-бот: привязка чата к профилю, очередь уведомлений (outbox), напоминания.
-- Бот работает на сервере сайта с секретным ключом Supabase; анонимам и игрокам эти таблицы недоступны.

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Служебные секреты внутри базы (не покидают её, кроме вызова сайта по pg_net)
-- ---------------------------------------------------------------------------
create table private.app_settings (
  name text primary key,
  value text not null
);
revoke all on private.app_settings from public, anon, authenticated;

insert into private.app_settings (name, value) values
  ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex')),
  ('dispatch_url', 'https://mafiacl-web.vercel.app/api/telegram/dispatch');

-- Сайт проверяет, что вызов пришёл из этой базы (секрет сравнивается здесь, наружу не отдаётся).
create or replace function public.check_cron_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.app_settings where name = 'cron_secret' and value = p_secret);
$$;
revoke execute on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to service_role;

-- ---------------------------------------------------------------------------
-- Одноразовые коды привязки: кабинет → t.me/bot?start=<код> → бот запоминает чат
-- ---------------------------------------------------------------------------
create table public.telegram_link_tokens (
  token_hash text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '20 minutes',
  created_at timestamptz not null default now()
);
create index telegram_link_tokens_profile_id_idx on public.telegram_link_tokens (profile_id);
alter table public.telegram_link_tokens enable row level security;
revoke all on public.telegram_link_tokens from anon, authenticated;
grant all on public.telegram_link_tokens to service_role;

-- ---------------------------------------------------------------------------
-- Очередь уведомлений: триггеры кладут, сайт по сигналу из pg_cron отправляет
-- ---------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game_id bigint references public.games (id) on delete cascade,
  kind text not null check (kind in ('reminder', 'promoted', 'table_full', 'game_cancelled')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts smallint not null default 0,
  last_error text,
  constraint notifications_once unique (kind, game_id, profile_id)
);
create index notifications_pending_idx on public.notifications (created_at) where sent_at is null;
create index notifications_profile_id_idx on public.notifications (profile_id);
create index notifications_game_id_idx on public.notifications (game_id);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant all on public.notifications to service_role;

-- Переход из листа ожидания в состав → «вы в составе».
create or replace function private.notify_signup_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null and old.status = 'waitlist' and new.status = 'confirmed' then
    insert into public.notifications (profile_id, game_id, kind)
    values (new.profile_id, new.game_id, 'promoted')
    on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function private.notify_signup_change() from public, anon, authenticated;
create trigger game_signups_notify_change
  after update of status on public.game_signups
  for each row execute function private.notify_signup_change();

-- Стол собран (основной состав = лимит) → черновик поста владельцу и ведущим.
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
  if new.status <> 'confirmed' then
    return null;
  end if;
  select g.club_id, g.capacity into v_club, v_capacity from public.games g where g.id = new.game_id;
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
revoke execute on function private.notify_table_full() from public, anon, authenticated;
create trigger game_signups_notify_full
  after insert or update of status on public.game_signups
  for each row execute function private.notify_table_full();

-- Игра отменена → всем записавшимся.
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
    where s.game_id = new.id and s.profile_id is not null and s.status in ('confirmed', 'waitlist')
    on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function private.notify_game_cancelled() from public, anon, authenticated;
create trigger games_notify_cancelled
  after update of status on public.games
  for each row execute function private.notify_game_cancelled();

-- Напоминание за 3 часа до начала — основному составу.
create or replace function private.enqueue_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.notifications (profile_id, game_id, kind)
  select s.profile_id, g.id, 'reminder'
  from public.games g
  join public.game_signups s on s.game_id = g.id
  where g.status in ('open', 'closed')
    and g.starts_at between now() and now() + interval '3 hours'
    and s.status = 'confirmed'
    and s.profile_id is not null
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function private.enqueue_reminders() from public, anon, authenticated;

-- Каждые 5 минут: поставить напоминания и, если есть что отправлять, разбудить сайт.
create or replace function private.kick_telegram_dispatch()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_reminders();
  if exists (select 1 from public.notifications where sent_at is null and attempts < 5) then
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
revoke execute on function private.kick_telegram_dispatch() from public, anon, authenticated;

select cron.schedule('telegram-dispatch', '*/5 * * * *', $$select private.kick_telegram_dispatch()$$);

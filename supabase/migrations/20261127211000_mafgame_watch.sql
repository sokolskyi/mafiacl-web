-- Чужие турниры mafgame: ждём закрытия, чтобы найти призёров за MafiaCL (Respect за призовые места).
create table public.mafgame_watch (
  id integer primary key,
  name text,
  starts_on date,
  days smallint,
  checked_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index mafgame_watch_open_idx on public.mafgame_watch (starts_on) where not done;
alter table public.mafgame_watch enable row level security;
-- Только сервер (service_role).

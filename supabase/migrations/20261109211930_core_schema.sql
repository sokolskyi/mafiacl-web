-- MafiaCL — базовая схема: сеть клубов, профили, роли, игры и записи, турниры.
-- Все таблицы в public под RLS. С 2026-10-30 Supabase не открывает новые таблицы
-- в Data API автоматически, поэтому права выдаются явными GRANT внизу каждого блока.
-- Записи делает только сервер (service_role) или пользователь в рамках своих RLS-политик.

-- ---------------------------------------------------------------------------
-- Служебная схема: вспомогательные функции. Не открыта в Data API.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- География и клубы: страна → город → клуб → площадки
-- ---------------------------------------------------------------------------
create table public.countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),        -- ISO 3166-1 alpha-2
  name jsonb not null check (jsonb_typeof(name) = 'object'), -- {"cs": "...", "ru": "...", ...}
  created_at timestamptz not null default now()
);

create table public.cities (
  id bigint generated always as identity primary key,
  country_code text not null references public.countries (code),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name jsonb not null check (jsonb_typeof(name) = 'object'),
  timezone text not null default 'Europe/Prague',
  created_at timestamptz not null default now()
);
create index cities_country_code_idx on public.cities (country_code);

create table public.clubs (
  id bigint generated always as identity primary key,
  city_id bigint not null references public.cities (id),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  ownership text not null default 'own' check (ownership in ('own', 'franchise')),
  status text not null default 'active' check (status in ('active', 'hidden', 'closed')),
  founded_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clubs_city_id_idx on public.clubs (city_id);
create trigger clubs_set_updated_at before update on public.clubs
  for each row execute function private.set_updated_at();

create table public.venues (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  name text not null,
  address text,
  maps_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venues_club_id_idx on public.venues (club_id);
create trigger venues_set_updated_at before update on public.venues
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Профили. Публичная часть (ник, аватар) видна всем — она нужна для рейтингов
-- и списков записи. Контакты лежат отдельно и видны только владельцу.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text check (char_length(nickname) between 2 and 32),
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  locale text not null default 'cs' check (locale in ('cs', 'ru', 'uk', 'en')),
  home_club_id bigint references public.clubs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_nickname_lower_key on public.profiles (lower(nickname));
create index profiles_home_club_id_idx on public.profiles (home_club_id);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.profile_private (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  phone text,
  telegram_chat_id bigint unique,
  marketing_consent boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger profile_private_set_updated_at before update on public.profile_private
  for each row execute function private.set_updated_at();

-- Новый пользователь Auth → строка в profiles. Метаданные провайдера (имя, аватар)
-- берём только как подсказку для отображения, никогда для прав доступа.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  insert into public.profile_private (profile_id) values (new.id);
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Роли в клубе: owner (владелец), admin (администратор), host (ведущий).
-- ---------------------------------------------------------------------------
create table public.club_staff (
  club_id bigint not null references public.clubs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'host')),
  created_at timestamptz not null default now(),
  primary key (club_id, profile_id, role)
);
create index club_staff_profile_id_idx on public.club_staff (profile_id);

-- Проверка роли текущего пользователя в клубе. SECURITY DEFINER нужен, чтобы
-- политики club_staff не вызывали сами себя; функция смотрит только на auth.uid().
create or replace function private.has_club_role(p_club_id bigint, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.club_staff s
    where s.club_id = p_club_id
      and s.profile_id = (select auth.uid())
      and s.role = any (p_roles)
  );
$$;
revoke execute on function private.has_club_role(bigint, text[]) from public;
grant execute on function private.has_club_role(bigint, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Игры и запись. 10 игроков — стол; сверх лимита запись уходит в лист ожидания.
-- ---------------------------------------------------------------------------
create table public.games (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id),
  venue_id bigint references public.venues (id) on delete set null,
  host_profile_id uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  kind text not null default 'rating' check (kind in ('rating', 'fun', 'tournament', 'corporate', 'kids')),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'finished', 'cancelled')),
  capacity smallint not null default 10 check (capacity between 1 and 40),
  price_czk numeric(10, 2) check (price_czk >= 0),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index games_club_id_starts_at_idx on public.games (club_id, starts_at);
create index games_starts_at_open_idx on public.games (starts_at) where status = 'open';
create index games_venue_id_idx on public.games (venue_id);
create index games_host_profile_id_idx on public.games (host_profile_id);
create index games_created_by_idx on public.games (created_by);
create trigger games_set_updated_at before update on public.games
  for each row execute function private.set_updated_at();

create table public.game_signups (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  guest_name text check (char_length(guest_name) between 1 and 80),
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlist', 'cancelled')),
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- либо игрок из базы, либо гость без аккаунта
  constraint game_signups_player_xor_guest check (num_nonnulls(profile_id, guest_name) = 1)
);
-- Один активный слот на игрока в игре; после отмены можно записаться снова.
create unique index game_signups_active_player_key on public.game_signups (game_id, profile_id)
  where profile_id is not null and status <> 'cancelled';
create index game_signups_game_id_idx on public.game_signups (game_id);
create index game_signups_profile_id_idx on public.game_signups (profile_id);
create index game_signups_added_by_idx on public.game_signups (added_by);
create trigger game_signups_set_updated_at before update on public.game_signups
  for each row execute function private.set_updated_at();

-- Лимит стола: при записи сверх capacity ставим лист ожидания. Строка игры
-- блокируется, чтобы две одновременные записи не заняли одно место.
create or replace function private.signup_apply_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity smallint;
  v_taken integer;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;
  select g.capacity into v_capacity from public.games g where g.id = new.game_id for update;
  select count(*) into v_taken
  from public.game_signups s
  where s.game_id = new.game_id and s.status = 'confirmed' and s.id is distinct from new.id;
  if v_taken >= v_capacity then
    new.status := 'waitlist';
  end if;
  return new;
end;
$$;
revoke execute on function private.signup_apply_capacity() from public, anon, authenticated;

create trigger game_signups_apply_capacity
  before insert or update of status on public.game_signups
  for each row execute function private.signup_apply_capacity();

-- ---------------------------------------------------------------------------
-- Турниры (клубные, MafiaCL Kings, MCL Europe)
-- ---------------------------------------------------------------------------
create table public.tournaments (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  series text not null default 'club' check (series in ('club', 'kings', 'mcl_europe', 'other')),
  status text not null default 'draft' check (status in ('draft', 'announced', 'running', 'finished', 'cancelled')),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_dates check (ends_on is null or ends_on >= starts_on)
);
create index tournaments_club_id_starts_on_idx on public.tournaments (club_id, starts_on);
create trigger tournaments_set_updated_at before update on public.tournaments
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.clubs enable row level security;
alter table public.venues enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.club_staff enable row level security;
alter table public.games enable row level security;
alter table public.game_signups enable row level security;
alter table public.tournaments enable row level security;

-- Справочники видны всем; меняет их только сервер (service_role).
create policy "countries are public" on public.countries for select to anon, authenticated using (true);
create policy "cities are public" on public.cities for select to anon, authenticated using (true);

create policy "active clubs are public" on public.clubs for select to anon, authenticated
  using (status = 'active');
create policy "staff see own club" on public.clubs for select to authenticated
  using ((select private.has_club_role(id, array['owner', 'admin', 'host'])));
create policy "club admins update club" on public.clubs for update to authenticated
  using ((select private.has_club_role(id, array['owner', 'admin'])))
  with check ((select private.has_club_role(id, array['owner', 'admin'])));

create policy "venues are public" on public.venues for select to anon, authenticated using (true);
create policy "club admins insert venues" on public.venues for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "club admins update venues" on public.venues for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "club admins delete venues" on public.venues for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

-- Профили: публичная карточка игрока; правит только владелец.
create policy "profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "users read own private data" on public.profile_private for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy "users update own private data" on public.profile_private for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

-- Состав ведущих публичный; назначает роли только владелец клуба.
create policy "club staff is public" on public.club_staff for select to anon, authenticated using (true);
create policy "owners add staff" on public.club_staff for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner'])));
create policy "owners remove staff" on public.club_staff for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner'])));

-- Игры: черновики видят только сотрудники клуба.
create policy "published games are public" on public.games for select to anon, authenticated
  using (status <> 'draft');
create policy "staff see club games" on public.games for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "staff create games" on public.games for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "staff update games" on public.games for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "admins delete games" on public.games for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

-- Запись: список записавшихся на опубликованную игру виден всем (ники).
create policy "signups of published games are public" on public.game_signups for select to anon, authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.status <> 'draft'));
create policy "staff see club signups" on public.game_signups for select to authenticated
  using (exists (
    select 1 from public.games g
    where g.id = game_id and (select private.has_club_role(g.club_id, array['owner', 'admin', 'host']))
  ));
-- Игрок записывает только себя и только на открытую игру.
create policy "players sign themselves up" on public.game_signups for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and guest_name is null
    and status in ('confirmed', 'waitlist') -- триггер лимита может перевести в waitlist
    and exists (select 1 from public.games g where g.id = game_id and g.status = 'open')
  );
-- Игрок может только отменить свою запись.
create policy "players cancel own signup" on public.game_signups for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()) and status = 'cancelled');
-- Ведущие и админы управляют всей записью клуба, включая гостей.
create policy "staff manage signups" on public.game_signups for all to authenticated
  using (exists (
    select 1 from public.games g
    where g.id = game_id and (select private.has_club_role(g.club_id, array['owner', 'admin', 'host']))
  ))
  with check (exists (
    select 1 from public.games g
    where g.id = game_id and (select private.has_club_role(g.club_id, array['owner', 'admin', 'host']))
  ));

create policy "published tournaments are public" on public.tournaments for select to anon, authenticated
  using (status <> 'draft');
create policy "admins manage tournaments" on public.tournaments for all to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));

-- ---------------------------------------------------------------------------
-- Права Data API (RLS решает, какие строки; GRANT — доступна ли таблица вообще)
-- ---------------------------------------------------------------------------
grant select on public.countries, public.cities, public.clubs, public.venues,
  public.profiles, public.club_staff, public.games, public.game_signups, public.tournaments
  to anon, authenticated;

grant update (name, status, founded_on) on public.clubs to authenticated;
grant insert, update, delete on public.venues to authenticated;
grant update (nickname, display_name, avatar_url, locale, home_club_id) on public.profiles to authenticated;
grant select, update (phone, telegram_chat_id, marketing_consent) on public.profile_private to authenticated;
grant insert, delete on public.club_staff to authenticated;
grant insert, update, delete on public.games to authenticated;
grant insert, update, delete on public.game_signups to authenticated;
grant insert, update, delete on public.tournaments to authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Стартовые данные: Чехия, Прага, клуб MafiaCL
-- ---------------------------------------------------------------------------
insert into public.countries (code, name) values
  ('CZ', '{"cs": "Česko", "ru": "Чехия", "uk": "Чехія", "en": "Czechia"}');

insert into public.cities (country_code, slug, name) values
  ('CZ', 'praha', '{"cs": "Praha", "ru": "Прага", "uk": "Прага", "en": "Prague"}');

insert into public.clubs (city_id, slug, name, ownership, founded_on)
select id, 'mafiacl-praha', 'MafiaCL Praha', 'own', null from public.cities where slug = 'praha';

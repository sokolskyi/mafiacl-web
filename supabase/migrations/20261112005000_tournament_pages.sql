-- Страницы турниров: анонс, обложка, место, регистрация (у нас на сайте или по внешней ссылке).
alter table public.tournaments
  add column description jsonb check (description is null or jsonb_typeof(description) = 'object'),
  add column cover_url text check (cover_url is null or private.is_image_ref(cover_url)),
  add column starts_at timestamptz,
  add column city text check (char_length(city) <= 80),
  add column venue_name text check (char_length(venue_name) <= 120),
  add column venue_address text check (char_length(venue_address) <= 200),
  add column organizer text check (char_length(organizer) <= 120),   -- пусто — турнир нашего клуба
  add column registration text not null default 'none' check (registration in ('none', 'external', 'internal')),
  add column registration_url text check (registration_url is null or registration_url ~ '^https://[^\s]+$'),
  add column registration_closes_at timestamptz,
  add column capacity smallint check (capacity between 1 and 1000),
  add column price_czk numeric(10, 2) check (price_czk >= 0);

grant select (description, cover_url, starts_at, city, venue_name, venue_address, organizer, registration,
              registration_url, registration_closes_at, capacity, price_czk) on public.tournaments to anon, authenticated;
grant insert (description, cover_url, starts_at, city, venue_name, venue_address, organizer, registration,
              registration_url, registration_closes_at, capacity, price_czk),
      update (description, cover_url, starts_at, city, venue_name, venue_address, organizer, registration,
              registration_url, registration_closes_at, capacity, price_czk) on public.tournaments to authenticated;

create table public.tournament_registrations (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references public.tournaments (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'waitlist', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tournament_registrations_active_key on public.tournament_registrations (tournament_id, profile_id)
  where status <> 'cancelled';
create index tournament_registrations_profile_idx on public.tournament_registrations (profile_id);
create trigger tournament_registrations_set_updated_at before update on public.tournament_registrations
  for each row execute function private.set_updated_at();
alter table public.tournament_registrations enable row level security;

-- Список участников открытых турниров виден всем (как запись на игры).
create policy "registrations of published tournaments are public" on public.tournament_registrations
  for select to anon, authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.status <> 'draft'));
create policy "players register themselves" on public.tournament_registrations for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and status in ('registered', 'waitlist')
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.status = 'announced' and t.registration = 'internal'
        and (t.registration_closes_at is null or t.registration_closes_at > now())
    )
  );
create policy "players cancel own registration" on public.tournament_registrations for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()) and status = 'cancelled');
create policy "admins manage registrations" on public.tournament_registrations for all to authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and (select private.has_club_role(t.club_id, array['owner', 'admin']))))
  with check (exists (select 1 from public.tournaments t where t.id = tournament_id and (select private.has_club_role(t.club_id, array['owner', 'admin']))));

grant select (id, tournament_id, profile_id, status, created_at) on public.tournament_registrations to anon, authenticated;
grant insert (tournament_id, profile_id, status), update (status), delete on public.tournament_registrations to authenticated;
grant all on public.tournament_registrations to service_role;

-- Лимит мест: сверх лимита — лист ожидания; при отмене первый из листа ожидания проходит.
create function private.tournament_reg_capacity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_cap smallint; v_taken integer;
begin
  if new.status <> 'registered' then return new; end if;
  select capacity into v_cap from public.tournaments where id = new.tournament_id for update;
  if v_cap is null then return new; end if;
  select count(*) into v_taken from public.tournament_registrations
    where tournament_id = new.tournament_id and status = 'registered' and id is distinct from new.id;
  if v_taken >= v_cap then new.status := 'waitlist'; end if;
  return new;
end;
$$;
create trigger tournament_reg_capacity before insert on public.tournament_registrations
  for each row execute function private.tournament_reg_capacity();

create function private.tournament_reg_promote() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_next bigint;
begin
  if old.status = 'registered' and new.status = 'cancelled' then
    select id into v_next from public.tournament_registrations
      where tournament_id = new.tournament_id and status = 'waitlist' order by created_at limit 1 for update skip locked;
    if v_next is not null then
      update public.tournament_registrations set status = 'registered' where id = v_next;
    end if;
  end if;
  return null;
end;
$$;
create trigger tournament_reg_promote after update of status on public.tournament_registrations
  for each row execute function private.tournament_reg_promote();

-- Заблокированный игрок не регистрируется на турниры клуба.
create function private.tournament_reg_reject_banned() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.is_banned((select club_id from public.tournaments where id = new.tournament_id), new.profile_id) then
    raise exception 'banned' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger tournament_reg_reject_banned before insert on public.tournament_registrations
  for each row execute function private.tournament_reg_reject_banned();

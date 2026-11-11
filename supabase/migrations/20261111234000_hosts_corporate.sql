-- Ведущие клуба (страница «Ведущие», блок на странице корпоративов) и заявки на корпоративы.

create table public.hosts (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  nickname text not null check (char_length(nickname) between 1 and 32),
  name text not null check (char_length(name) between 1 and 60),
  languages text[] not null default '{}' check (languages <@ array['cs', 'ru', 'uk', 'en']::text[]),
  playing_since smallint check (playing_since between 1990 and 2100),
  hosting_since smallint check (hosting_since between 1990 and 2100),
  photo_url text check (photo_url is null or private.is_image_ref(photo_url)),
  bio jsonb check (bio is null or jsonb_typeof(bio) = 'object'),
  active boolean not null default true,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);
create index hosts_club_idx on public.hosts (club_id, sort);
create index hosts_profile_idx on public.hosts (profile_id);
alter table public.hosts enable row level security;

create policy "active hosts are public" on public.hosts for select to anon, authenticated using (active);
create policy "admins see hosts" on public.hosts for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins add hosts" on public.hosts for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins edit hosts" on public.hosts for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins remove hosts" on public.hosts for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select (id, club_id, profile_id, nickname, name, languages, playing_since, hosting_since, photo_url, bio, active, sort)
  on public.hosts to anon, authenticated;
grant insert (club_id, profile_id, nickname, name, languages, playing_since, hosting_since, photo_url, bio, active, sort),
      update (profile_id, nickname, name, languages, playing_since, hosting_since, photo_url, bio, active, sort),
      delete on public.hosts to authenticated;
grant all on public.hosts to service_role;

insert into public.hosts (club_id, nickname, name, languages, sort)
select c.id, h.nickname, h.name, h.langs, h.sort
from public.clubs c,
  (values ('YeS', 'Ievgen', array['ru', 'uk', 'en'], 10),
          ('Trinity', 'Дарьяна', array['ru', 'cs'], 20),
          ('Selenix', 'Николай', array['ru', 'uk'], 30),
          ('Espresso Martini', 'Алиса', array['ru', 'uk', 'en'], 40),
          ('Annvie', 'Анна', array['ru', 'uk'], 50)) as h(nickname, name, langs, sort)
where c.slug = 'mafiacl-prague';

-- Привязка к аккаунту игрока по нику, если такой уже есть.
update public.hosts h set profile_id = p.id
from public.profiles p where lower(p.nickname) = lower(h.nickname) and h.profile_id is null;

-- Заявки на корпоратив: пишет только сервер (после проверки формы), читают владелец/админ.
create table public.corporate_requests (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  company text check (char_length(company) <= 120),
  contact text not null check (char_length(contact) between 3 and 120),
  event_date date,
  guests smallint check (guests between 1 and 1000),
  format text check (format in ('teambuilding', 'party', 'birthday', 'office', 'club', 'other')),
  language text check (language in ('cs', 'ru', 'uk', 'en')),
  message text check (char_length(message) <= 2000),
  site_locale text,
  ip_hash text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done', 'rejected')),
  created_at timestamptz not null default now()
);
create index corporate_requests_club_idx on public.corporate_requests (club_id, created_at desc);
create index corporate_requests_ip_idx on public.corporate_requests (ip_hash, created_at);
alter table public.corporate_requests enable row level security;

create policy "admins see requests" on public.corporate_requests for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins update requests" on public.corporate_requests for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select (id, club_id, name, company, contact, event_date, guests, format, language, message, status, created_at)
  on public.corporate_requests to authenticated;
grant update (status) on public.corporate_requests to authenticated;
grant all on public.corporate_requests to service_role;

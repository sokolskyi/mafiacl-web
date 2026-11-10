-- Титулы игроков: ⭐ чемпион сезона Premier League, 👑 победитель MafiaCL Kings.
-- ⚜️ (победитель последнего мини-турнира) не хранится — считается из итогов вечеров.
-- Как и абонементы, титул можно записать на ник игрока, ещё не зарегистрированного на сайте.
create table public.player_titles (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  holder_name text check (char_length(holder_name) between 1 and 40),
  kind text not null check (kind in ('season_champion', 'kings_winner')),
  label text not null check (char_length(label) between 1 and 60),   -- «IV сезон», «MafiaCL Kings 2025»
  won_on date,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint player_titles_holder check (num_nonnulls(profile_id, holder_name) >= 1)
);
create index player_titles_profile_idx on public.player_titles (profile_id);
create index player_titles_club_idx on public.player_titles (club_id);
create index player_titles_created_by_idx on public.player_titles (created_by);
alter table public.player_titles enable row level security;
create policy "titles are public" on public.player_titles for select to anon, authenticated using (true);
create policy "admins manage titles" on public.player_titles for all to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
grant select on public.player_titles to anon, authenticated;
grant insert (club_id, profile_id, holder_name, kind, label, won_on), update (profile_id, holder_name, label, won_on), delete
  on public.player_titles to authenticated;
grant all on public.player_titles to service_role;

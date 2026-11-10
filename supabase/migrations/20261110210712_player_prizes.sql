-- Призовые игроков (Kč): финал сезона, раунды MafiaCl Arena и т. п. Записывает владелец/админ.
create table public.player_prizes (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  holder_name text check (char_length(holder_name) between 1 and 40),
  amount_czk integer not null check (amount_czk > 0 and amount_czk <= 1000000),
  label text not null check (char_length(label) between 1 and 80),   -- «Финал V сезона, 1 место», «Arena Round 19»
  won_on date,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint player_prizes_holder check (num_nonnulls(profile_id, holder_name) >= 1)
);
create index player_prizes_profile_idx on public.player_prizes (profile_id);
create index player_prizes_club_idx on public.player_prizes (club_id);
create index player_prizes_created_by_idx on public.player_prizes (created_by);
alter table public.player_prizes enable row level security;
create policy "prizes are public" on public.player_prizes for select to anon, authenticated using (true);
create policy "admins manage prizes" on public.player_prizes for all to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
grant select on public.player_prizes to anon, authenticated;
grant insert (club_id, profile_id, holder_name, amount_czk, label, won_on), update (profile_id, holder_name, amount_czk, label, won_on), delete
  on public.player_prizes to authenticated;
grant all on public.player_prizes to service_role;

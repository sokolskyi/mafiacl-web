-- «В клубе с (год)»: администрация задаёт вручную любому игроку (и из архива, без аккаунта).
-- Если записи нет, профиль считает год сам по данным клуба.
create table if not exists public.player_club_since (
  nickname text primary key check (char_length(nickname) between 1 and 64),
  year smallint not null check (year between 2000 and 2100),
  updated_at timestamptz not null default now()
);

create unique index if not exists player_club_since_nickname_lower on public.player_club_since (lower(nickname));

alter table public.player_club_since enable row level security;

-- Читают все (показывается в публичном профиле). Пишет только сервер сервисным ключом из админки.
create policy "club since is public" on public.player_club_since
  for select to anon, authenticated using (true);

insert into public.player_club_since (nickname, year) values ('YeS', 2011)
on conflict (nickname) do update set year = excluded.year, updated_at = now();

select private.site_revalidate(array['player-aliases']);

-- Электронный бланк: партия = одна игра за одним столом (на вечере их несколько).
-- Ход игры — журнал действий ведущего (log); состояние пересчитывается из него в приложении.
-- По завершении итог раскладывается в match_players — из этих строк считается рейтинг.

create table public.matches (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete restrict,
  game_id bigint references public.games (id) on delete set null,      -- вечер из расписания
  number integer not null check (number > 0),                          -- «Игра 562», сквозной номер клуба
  table_no smallint not null default 1 check (table_no between 1 and 9),
  judge_id uuid references public.profiles (id) on delete set null,
  status text not null default 'live' check (status in ('live', 'finished', 'void')),
  result text check (result in ('civilians', 'mafia', 'draw')),
  rated boolean not null default true,
  seats jsonb not null default '[]'::jsonb check (jsonb_typeof(seats) = 'array'),  -- [{profile_id?, name}]
  log jsonb not null default '[]'::jsonb check (jsonb_typeof(log) = 'array'),
  version integer not null default 0,                                   -- защита от записи с двух устройств
  show_roles boolean not null default false,                            -- роли на слое трансляции
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint matches_number_key unique (club_id, number),
  constraint matches_finished check ((status = 'finished') = (result is not null and finished_at is not null))
);
create index matches_game_id_idx on public.matches (game_id);
create index matches_judge_id_idx on public.matches (judge_id);
create index matches_created_by_idx on public.matches (created_by);
create index matches_live_idx on public.matches (club_id, table_no) where status = 'live';
create trigger matches_set_updated_at before update on public.matches
  for each row execute function private.set_updated_at();

create table public.match_players (
  match_id bigint not null references public.matches (id) on delete cascade,
  seat smallint not null check (seat between 1 and 10),
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),       -- ник на момент игры (и для гостей)
  role text not null check (role in ('civilian', 'sheriff', 'mafia', 'don')),
  fouls smallint not null default 0 check (fouls between 0 and 10),
  out_reason text check (out_reason in ('killed', 'voted', 'removed')),
  out_round smallint,
  first_killed boolean not null default false,
  best_move smallint[],
  win boolean not null,
  best_move_points numeric(4, 2) not null default 0,
  extra numeric(4, 2) not null default 0 check (extra between -5 and 5),
  penalty numeric(4, 2) not null default 0 check (penalty between 0 and 5),
  points numeric(5, 2) not null,
  primary key (match_id, seat)
);
create index match_players_profile_idx on public.match_players (profile_id);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;

-- Сыгранные партии и их итог видны всем (рейтинг, профиль игрока). Идущие — только сотрудникам:
-- в журнале роли. Слой трансляции получает их через сервер, без ролей.
create policy "finished matches are public" on public.matches for select to anon, authenticated
  using (status = 'finished');
create policy "staff see club matches" on public.matches for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "staff create matches" on public.matches for insert to authenticated
  with check (
    (select private.has_club_role(club_id, array['owner', 'admin', 'host']))
    and (game_id is null or exists (select 1 from public.games g where g.id = game_id and g.club_id = matches.club_id))
  );
create policy "staff update matches" on public.matches for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "admins delete matches" on public.matches for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

create policy "results of finished matches are public" on public.match_players for select to anon, authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and m.status = 'finished'));
-- «for all» включает и чтение строк идущих партий.
create policy "staff write match players" on public.match_players for all to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id
    and (select private.has_club_role(m.club_id, array['owner', 'admin', 'host']))))
  with check (exists (select 1 from public.matches m where m.id = match_id
    and (select private.has_club_role(m.club_id, array['owner', 'admin', 'host']))));

grant select on public.matches, public.match_players to anon, authenticated;
grant insert (club_id, game_id, number, table_no, judge_id, rated, seats),
      update (game_id, number, table_no, judge_id, status, result, rated, seats, log, version, show_roles, finished_at),
      delete on public.matches to authenticated;
grant insert, update, delete on public.match_players to authenticated;
grant all on public.matches, public.match_players to service_role;

-- Следующий номер партии клуба (по умолчанию в форме «Новая партия»).
create or replace function public.next_match_number(p_club_id bigint)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(max(number), 0) + 1 from public.matches where club_id = p_club_id;
$$;
grant execute on function public.next_match_number(bigint) to authenticated;

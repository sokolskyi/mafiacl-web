-- Турниры клуба с mafgame.org: итоги игроков для статистики и Respect за турнирные игры.
-- Импорт делает сайт (/api/cron/mafgame), база только хранит и начисляет.

create table public.mafgame_tournaments (
  id integer primary key,                 -- id турнира на mafgame
  club_id integer,                        -- клуб-организатор на mafgame (4 = MafiaCL)
  name text not null check (char_length(name) <= 200),
  starts_on date,
  days smallint,
  stars smallint,
  status text,                            -- как на mafgame: planned, closed, …
  players smallint,
  stages jsonb not null default '[]',     -- [{name, tables, sessions}]
  tournament_id bigint references public.tournaments (id) on delete set null,
  -- Начислять ли Respect (Арены считаются по электронному бланку на сайте — там выключено).
  respect boolean not null default true,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index mafgame_tournaments_starts on public.mafgame_tournaments (starts_on desc);

create table public.mafgame_results (
  tournament_id integer not null references public.mafgame_tournaments (id) on delete cascade,
  user_id integer not null,               -- id игрока на mafgame
  nickname text not null check (char_length(nickname) <= 64),
  club text check (char_length(club) <= 120),
  place smallint,
  games smallint not null default 0,
  wins smallint not null default 0,
  score numeric(8, 2),
  stage smallint not null default 1,      -- до какого этапа дошёл (1 — квалификация)
  profile_id uuid references public.profiles (id) on delete set null,
  primary key (tournament_id, user_id)
);
create index mafgame_results_nick on public.mafgame_results (lower(nickname));
create index mafgame_results_profile on public.mafgame_results (profile_id) where profile_id is not null;

alter table public.mafgame_tournaments enable row level security;
alter table public.mafgame_results enable row level security;
create policy "mafgame tournaments are public" on public.mafgame_tournaments for select to anon, authenticated using (true);
create policy "mafgame results are public" on public.mafgame_results for select to anon, authenticated using (true);
grant select on public.mafgame_tournaments, public.mafgame_results to anon, authenticated;

-- С какой даты турниры дают Respect (запуск сайта) и докуда дошёл обход id.
insert into private.app_settings (name, value) values
  ('mafgame_respect_from', '2027-02-01'),
  ('mafgame_next_id', '1'),
  ('mafgame_import_url', 'https://mafiacl-web.vercel.app/api/cron/mafgame')
on conflict (name) do nothing;

create or replace function public.mafgame_next_id()
returns integer language sql security definer set search_path = '' stable as $$
  select coalesce((select value::integer from private.app_settings where name = 'mafgame_next_id'), 1);
$$;

create or replace function public.mafgame_set_next_id(p_id integer)
returns void language sql security definer set search_path = '' as $$
  update private.app_settings set value = greatest(p_id, 1)::text where name = 'mafgame_next_id';
$$;

-- Привязать строки турнира к профилям: сначала по ссылке на профиль mafgame, иначе по нику (с учётом старых ников),
-- если такой ник на сайте ровно один. Профиль со ссылкой на другого игрока mafgame по нику не привязывается.
create or replace function private.mafgame_link(p_tournament integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.mafgame_results r
     set profile_id = coalesce(
       (select p.id from public.profiles p
         where substring(p.links ->> 'mafgame' from '/user/([0-9]+)')::integer = r.user_id
         limit 1),
       (select (array_agg(p.id))[1] from public.profiles p
         where lower(p.nickname) = lower(coalesce(
                 (select a.canonical from public.player_aliases a where lower(a.alias) = lower(r.nickname) limit 1),
                 r.nickname))
           and (substring(p.links ->> 'mafgame' from '/user/([0-9]+)') is null)
         having count(*) = 1)
     )
   where r.tournament_id = p_tournament;
end;
$$;

-- Сколько игр у игрока для юбилеев: партии сайта + игры турниров mafgame (2 Respect за игру).
create or replace function private.respect_games(p_profile uuid)
returns integer language sql security definer set search_path = '' stable as $$
  select (count(*) filter (where ref like 'match:%')
          + coalesce(sum(amount / 2) filter (where ref like 'mafgame:%'), 0))::integer
  from public.respect_ledger where profile_id = p_profile and reason = 'game';
$$;

-- Respect за турнир mafgame: 2 за каждую сыгранную игру, одна запись на турнир (ref mafgame:<id>).
-- Только турниры клуба (организатор MafiaCL или турнир есть на сайте), закрытые, не раньше mafgame_respect_from,
-- игрокам с одобренным аккаунтом. Повторный вызов поправит сумму, если итоги изменились.
create or replace function public.respect_award_mafgame(p_tournament integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  t record;
  r record;
  v_from date;
  v_club bigint;
  v_n integer := 0;
  v_games integer;
  ms integer[] := array[50, 100, 250, 500];
  mb integer[] := array[25, 50, 100, 200];
  i integer;
begin
  perform private.mafgame_link(p_tournament);
  select * into t from public.mafgame_tournaments where id = p_tournament;
  if not found or not t.respect or t.status <> 'closed' then return 0; end if;
  if coalesce(t.club_id, 0) <> 4 and t.tournament_id is null then return 0; end if;
  v_from := (select value::date from private.app_settings where name = 'mafgame_respect_from');
  if v_from is null or t.starts_on is null or t.starts_on < v_from then return 0; end if;
  v_club := coalesce((select club_id from public.tournaments where id = t.tournament_id),
                     (select id from public.clubs where slug = 'mafiacl-prague'));

  delete from public.respect_ledger l
   where l.ref = 'mafgame:' || p_tournament and l.reason = 'game'
     and not exists (select 1 from public.mafgame_results x
                      join public.profiles p on p.id = x.profile_id
                     where x.tournament_id = p_tournament and x.profile_id = l.profile_id
                       and x.games > 0 and p.verification = 'approved');

  for r in
    select x.profile_id, sum(x.games)::integer as games
      from public.mafgame_results x join public.profiles p on p.id = x.profile_id
     where x.tournament_id = p_tournament and x.games > 0 and p.verification = 'approved'
     group by x.profile_id
  loop
    insert into public.respect_ledger (club_id, profile_id, amount, reason, ref, note)
      values (v_club, r.profile_id, 2 * r.games, 'game', 'mafgame:' || p_tournament, left(t.name, 200))
      on conflict (profile_id, ref) where ref is not null
      do update set amount = excluded.amount, note = excluded.note
      where public.respect_ledger.amount is distinct from excluded.amount;
    v_n := v_n + 1;
    v_games := private.respect_games(r.profile_id);
    for i in 1 .. array_length(ms, 1) loop
      if v_games >= ms[i] then
        perform private.respect_add(v_club, r.profile_id, mb[i], 'milestone', 'milestone:' || ms[i], ms[i]::text, null);
      end if;
    end loop;
  end loop;
  return v_n;
end;
$$;

revoke execute on function public.mafgame_next_id() from public, anon, authenticated;
revoke execute on function public.mafgame_set_next_id(integer) from public, anon, authenticated;
revoke execute on function public.respect_award_mafgame(integer) from public, anon, authenticated;
revoke execute on function private.mafgame_link(integer) from public, anon, authenticated;
revoke execute on function private.respect_games(uuid) from public, anon, authenticated;
grant execute on function public.mafgame_next_id() to service_role;
grant execute on function public.mafgame_set_next_id(integer) to service_role;
grant execute on function public.respect_award_mafgame(integer) to service_role;

-- Юбилеи в партиях сайта тоже считают турнирные игры.
create or replace function public.respect_award_match(p_match bigint)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m record;
  r record;
  v_mult integer;
  v_games integer;
  v_n integer := 0;
  v_streak integer;
  ev record;
  ms integer[] := array[50, 100, 250, 500];
  mb integer[] := array[25, 50, 100, 200];
  i integer;
begin
  select mt.id, mt.club_id, mt.game_id, mt.status, g.kind, g.final_rating_id, g.starts_at
    into m
    from public.matches mt left join public.games g on g.id = mt.game_id
    where mt.id = p_match;
  if not found or m.status <> 'finished' then return 0; end if;
  v_mult := case
    when m.final_rating_id is not null then 3
    when m.kind = 'tournament' then 2
    when m.kind in ('rating', 'fun') or m.kind is null then 1
    else 0 end;
  if v_mult = 0 then return 0; end if;

  delete from public.respect_ledger l
    where l.ref = 'match:' || p_match and l.reason = 'game'
      and not exists (select 1 from public.match_players mp where mp.match_id = p_match and mp.profile_id = l.profile_id);
  delete from public.respect_ledger where ref = 'best3:' || p_match;

  for r in
    select distinct mp.profile_id
    from public.match_players mp join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match and p.verification = 'approved'
  loop
    if private.respect_add(m.club_id, r.profile_id, v_mult, 'game', 'match:' || p_match, null, null) then v_n := v_n + 1; end if;
    perform private.respect_add(m.club_id, r.profile_id, 20, 'first_game', 'first_game', null, null);
    v_games := private.respect_games(r.profile_id);
    for i in 1 .. array_length(ms, 1) loop
      if v_games >= ms[i] then
        perform private.respect_add(m.club_id, r.profile_id, mb[i], 'milestone', 'milestone:' || ms[i], ms[i]::text, null);
      end if;
    end loop;

    if m.game_id is not null then
      v_streak := 0;
      for ev in
        select g.id,
               exists (select 1 from public.matches x join public.match_players y on y.match_id = x.id
                       where x.game_id = g.id and x.status = 'finished' and y.profile_id = r.profile_id) as played
        from public.games g
        where g.club_id = m.club_id and g.kind in ('rating', 'fun', 'tournament') and g.starts_at <= m.starts_at
          and exists (select 1 from public.matches x where x.game_id = g.id and x.status = 'finished')
        order by g.starts_at desc
        limit 60
      loop
        exit when not ev.played;
        v_streak := v_streak + 1;
      end loop;
      if v_streak > 0 and v_streak % 10 = 4 then
        perform private.respect_add(m.club_id, r.profile_id, 1, 'streak', 'streak:' || m.game_id, v_streak::text, null);
      elsif v_streak > 0 and v_streak % 10 = 0 then
        perform private.respect_add(m.club_id, r.profile_id, 3, 'streak', 'streak:' || m.game_id, v_streak::text, null);
      end if;
    end if;
  end loop;

  insert into public.respect_ledger (club_id, profile_id, amount, reason, ref)
    select m.club_id, mp.profile_id, 1, 'best_move', 'best3:' || p_match
    from public.match_players mp join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match and mp.first_killed and p.verification = 'approved'
      and (select count(*) from public.match_players b
           where b.match_id = p_match and b.role in ('mafia', 'don') and b.seat = any(mp.best_move)) = 3
    on conflict (profile_id, ref) where ref is not null do nothing;

  if m.kind = 'rating' and m.final_rating_id is null and m.game_id is not null then
    delete from public.respect_ledger where ref = 'evening_win:' || m.game_id;
    insert into public.respect_ledger (club_id, profile_id, amount, reason, ref)
      select m.club_id, st.profile_id, 5, 'evening_win', 'evening_win:' || m.game_id
      from public.evening_standings(m.game_id) st join public.profiles p on p.id = st.profile_id
      where st.place = 1 and st.profile_id is not null and p.verification = 'approved'
      on conflict (profile_id, ref) where ref is not null do nothing;
  end if;
  return v_n;
end;
$function$;

-- Будильник: каждые 30 минут сайт дочитывает новые id и обновляет идущие турниры клуба.
create or replace function private.kick_mafgame_import()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := (select value from private.app_settings where name = 'mafgame_import_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from private.app_settings where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;
revoke execute on function private.kick_mafgame_import() from public, anon, authenticated;
select cron.schedule('mafgame-import', '7,37 * * * *', 'select private.kick_mafgame_import()');

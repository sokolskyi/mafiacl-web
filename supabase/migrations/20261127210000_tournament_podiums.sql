-- Respect за призовое место на турнире любой федерации, если игрок выступал за MafiaCL:
-- 1 место — 30, 2 — 20, 3 — 10. Mafgame — автоматически (клуб игрока в результатах турнира),
-- другие федерации — заявка игрока со ссылкой на результаты, подтверждает администрация клуба.
-- Турниры с даты private.app_settings.mafgame_respect_from (запуск сайта).

alter table public.respect_ledger drop constraint respect_ledger_reason_check;
alter table public.respect_ledger add constraint respect_ledger_reason_check check (reason in (
  'game', 'first_game', 'milestone', 'evening_win', 'best_move', 'streak', 'membership', 'bonus', 'referral', 'birthday',
  'blog', 'review', 'code', 'spend_game', 'spend_shop', 'refund', 'adjust', 'expire', 'podium'));

create table public.tournament_podiums (
  id bigint generated always as identity primary key,
  profile_id uuid references public.profiles (id) on delete cascade,
  source text not null check (source in ('mafgame', 'claim')),
  mafgame_tournament_id integer,
  mafgame_user_id integer,
  nickname text check (char_length(nickname) <= 60),
  tournament_name text not null check (char_length(tournament_name) between 1 and 200),
  federation text check (char_length(federation) <= 60),
  played_on date not null,
  place smallint not null check (place between 1 and 3),
  results_url text check (results_url ~ '^https://' and char_length(results_url) <= 500),
  club_name text check (char_length(club_name) <= 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (mafgame_tournament_id, mafgame_user_id),
  check ((source = 'mafgame') = (mafgame_tournament_id is not null and mafgame_user_id is not null)),
  check (source = 'mafgame' or (profile_id is not null and results_url is not null))
);
create unique index tournament_podiums_claim_once on public.tournament_podiums (profile_id, lower(tournament_name), played_on)
  where source = 'claim' and status <> 'rejected';
create index tournament_podiums_profile_idx on public.tournament_podiums (profile_id);
create index tournament_podiums_pending_idx on public.tournament_podiums (created_at) where status = 'pending';
alter table public.tournament_podiums enable row level security;
create policy "players see own podiums" on public.tournament_podiums for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "staff see podiums" on public.tournament_podiums for select to authenticated
  using (exists (select 1 from public.club_staff s where s.profile_id = (select auth.uid()) and s.role in ('owner', 'admin')));
grant select on public.tournament_podiums to authenticated;

-- Начислить Respect за подтверждённое призовое место (один раз).
create or replace function private.podium_award(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.tournament_podiums; v_from date; v_club bigint;
begin
  select * into r from public.tournament_podiums where id = p_id;
  if not found or r.status <> 'approved' or r.profile_id is null then return false; end if;
  if not exists (select 1 from public.profiles p where p.id = r.profile_id and p.verification = 'approved') then return false; end if;
  v_from := (select value::date from private.app_settings where name = 'mafgame_respect_from');
  if v_from is null or r.played_on < v_from then return false; end if;
  select id into v_club from public.clubs where slug = 'mafiacl-prague';
  return private.respect_add(v_club, r.profile_id, case r.place when 1 then 30 when 2 then 20 else 10 end,
    'podium', 'podium:' || r.id, left(r.place || ' · ' || r.tournament_name, 200), r.decided_by);
end;
$$;

-- Mafgame: призёры турнира, заявленные за MafiaCL (строки передаёт импорт). Только сервер.
create or replace function public.podium_from_mafgame(p_tournament integer, p_name text, p_date date, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  x jsonb; v_id bigint; v_profile uuid; v_n integer := 0;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then return 0; end if;
  for x in select * from jsonb_array_elements(p_rows) loop
    if (x ->> 'place')::integer not between 1 and 3 then continue; end if;
    -- Профиль: по ссылке на mafgame в кабинете, иначе по нику (с учётом старых ников), как в mafgame_link.
    v_profile := coalesce(
      (select p.id from public.profiles p
        where substring(p.links ->> 'mafgame' from '/user/([0-9]+)')::integer = (x ->> 'userId')::integer limit 1),
      (select (array_agg(p.id))[1] from public.profiles p
        where lower(p.nickname) = lower(coalesce(
                (select a.canonical from public.player_aliases a where lower(a.alias) = lower(x ->> 'nickname') limit 1),
                x ->> 'nickname'))
          and substring(p.links ->> 'mafgame' from '/user/([0-9]+)') is null
        having count(*) = 1));
    insert into public.tournament_podiums (profile_id, source, mafgame_tournament_id, mafgame_user_id, nickname,
        tournament_name, federation, played_on, place, results_url, club_name, status, decided_at)
      values (v_profile, 'mafgame', p_tournament, (x ->> 'userId')::integer, left(x ->> 'nickname', 60),
        left(p_name, 200), 'Mafgame', p_date, (x ->> 'place')::smallint,
        'https://mafgame.org/tournaments/' || p_tournament || '/results', left(x ->> 'club', 120), 'approved', now())
      on conflict (mafgame_tournament_id, mafgame_user_id) do update
        set profile_id = coalesce(public.tournament_podiums.profile_id, excluded.profile_id),
            place = excluded.place, tournament_name = excluded.tournament_name, played_on = excluded.played_on
      returning id into v_id;
    if private.podium_award(v_id) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.podium_from_mafgame(integer, text, date, jsonb) from public, anon, authenticated;
grant execute on function public.podium_from_mafgame(integer, text, date, jsonb) to service_role;

-- Заявка игрока (другие федерации).
create or replace function public.podium_claim(p_name text, p_federation text, p_date date, p_place integer, p_url text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid(); v_id bigint; v_from date;
  v_today date := (now() at time zone 'Europe/Prague')::date;
begin
  if v_me is null or not exists (select 1 from public.profiles where id = v_me and verification = 'approved') then
    raise exception 'forbidden';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 200 or p_place not between 1 and 3
     or coalesce(p_url, '') !~ '^https://[^\s]+$' or char_length(p_url) > 500 then
    raise exception 'invalid';
  end if;
  v_from := (select value::date from private.app_settings where name = 'mafgame_respect_from');
  if p_date is null or p_date > v_today or p_date < coalesce(v_from, v_today) then raise exception 'date'; end if;
  if (select count(*) from public.tournament_podiums where profile_id = v_me and status = 'pending') >= 5 then
    raise exception 'too_many';
  end if;
  insert into public.tournament_podiums (profile_id, source, tournament_name, federation, played_on, place, results_url)
    values (v_me, 'claim', btrim(p_name), nullif(left(btrim(coalesce(p_federation, '')), 60), ''), p_date, p_place, btrim(p_url))
    returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'duplicate';
end;
$$;
revoke execute on function public.podium_claim(text, text, date, integer, text) from public, anon;
grant execute on function public.podium_claim(text, text, date, integer, text) to authenticated;

-- Решение администрации по заявке.
create or replace function public.podium_decide(p_id bigint, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_status text;
begin
  if not exists (select 1 from public.club_staff where profile_id = auth.uid() and role in ('owner', 'admin')) then
    raise exception 'forbidden';
  end if;
  update public.tournament_podiums
    set status = case when p_approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now()
    where id = p_id and source = 'claim' and status = 'pending'
    returning status into v_status;
  if v_status is null then raise exception 'not_found'; end if;
  if v_status = 'approved' then perform private.podium_award(p_id); end if;
  return v_status;
end;
$$;
revoke execute on function public.podium_decide(bigint, boolean) from public, anon;
grant execute on function public.podium_decide(bigint, boolean) to authenticated;

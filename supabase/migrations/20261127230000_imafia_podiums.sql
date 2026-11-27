-- Призовые места на iMafia: участник клуба Mafia CL Prague на iMafia (imafia.org/club/50) занял 1–3 место
-- в основном турнире (серии лиг не считаются) → Respect 30/20/10. Импорт — вместе с mafgame (api/cron/mafgame).

alter table public.tournament_podiums drop constraint tournament_podiums_source_check;
alter table public.tournament_podiums add constraint tournament_podiums_source_check check (source in ('mafgame', 'imafia', 'claim'));
alter table public.tournament_podiums
  add column imafia_tournament_id integer,
  add column imafia_user_id integer,
  add constraint tournament_podiums_imafia_key unique (imafia_tournament_id, imafia_user_id),
  add constraint tournament_podiums_imafia_ids check ((source = 'imafia') = (imafia_tournament_id is not null and imafia_user_id is not null));

-- Турниры iMafia, которые ждут окончания (серии сюда не попадают).
create table public.imafia_watch (
  id integer primary key,
  name text,
  starts_on date,
  days smallint,
  checked_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index imafia_watch_open_idx on public.imafia_watch (starts_on) where not done;
alter table public.imafia_watch enable row level security;

insert into private.app_settings (name, value) values ('imafia_next_id', '2000') on conflict (name) do nothing;

create or replace function public.imafia_next_id()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select value::integer from private.app_settings where name = 'imafia_next_id'), 2000);
$$;
create or replace function public.imafia_set_next_id(p_id integer)
returns void language sql security definer set search_path = '' as $$
  update private.app_settings set value = p_id::text where name = 'imafia_next_id' and value::integer < p_id;
$$;
revoke execute on function public.imafia_next_id() from public, anon, authenticated;
revoke execute on function public.imafia_set_next_id(integer) from public, anon, authenticated;
grant execute on function public.imafia_next_id() to service_role;
grant execute on function public.imafia_set_next_id(integer) to service_role;

-- Призёры основного турнира iMafia из клуба (строки передаёт импорт). Только сервер.
create or replace function public.podium_from_imafia(p_tournament integer, p_name text, p_date date, p_rows jsonb)
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
    -- Профиль: по ссылке на iMafia в кабинете (/u/<id>), иначе по нику (с учётом старых ников).
    v_profile := coalesce(
      (select p.id from public.profiles p
        where substring(p.links ->> 'imafia' from '/u/([0-9]+)')::integer = (x ->> 'userId')::integer limit 1),
      (select (array_agg(p.id))[1] from public.profiles p
        where lower(p.nickname) = lower(coalesce(
                (select a.canonical from public.player_aliases a where lower(a.alias) = lower(x ->> 'nickname') limit 1),
                x ->> 'nickname'))
          and substring(p.links ->> 'imafia' from '/u/([0-9]+)') is null
        having count(*) = 1));
    insert into public.tournament_podiums (profile_id, source, imafia_tournament_id, imafia_user_id, nickname,
        tournament_name, federation, played_on, place, results_url, club_name, status, decided_at)
      values (v_profile, 'imafia', p_tournament, (x ->> 'userId')::integer, left(x ->> 'nickname', 60),
        left(p_name, 200), 'iMafia', p_date, (x ->> 'place')::smallint,
        'https://imafia.org/tournament/' || p_tournament || '#tournament-tables', 'Mafia CL Prague', 'approved', now())
      on conflict (imafia_tournament_id, imafia_user_id) do update
        set profile_id = coalesce(public.tournament_podiums.profile_id, excluded.profile_id),
            place = excluded.place, tournament_name = excluded.tournament_name, played_on = excluded.played_on
      returning id into v_id;
    if private.podium_award(v_id) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.podium_from_imafia(integer, text, date, jsonb) from public, anon, authenticated;
grant execute on function public.podium_from_imafia(integer, text, date, jsonb) to service_role;

-- Профиль может быть пустым и у призёра с iMafia (пока игрок не найден на сайте); обязателен только у заявки.
alter table public.tournament_podiums drop constraint tournament_podiums_check1;
alter table public.tournament_podiums add constraint tournament_podiums_claim_fields check (source <> 'claim' or (profile_id is not null and results_url is not null));

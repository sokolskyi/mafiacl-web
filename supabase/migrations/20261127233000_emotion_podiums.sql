-- Призовые места на Emotion Games: участник клуба MafiaCL Prague на EG (emotion.games/clubs/59, состав за год турнира)
-- занял 1–3 место в основном турнире (type_id = 1; серии и командные не считаются) → Respect 30/20/10.
-- Данные — открытый API api-v1.emotion.games; импорт вместе с mafgame.

alter table public.tournament_podiums drop constraint tournament_podiums_source_check;
alter table public.tournament_podiums add constraint tournament_podiums_source_check check (source in ('mafgame', 'imafia', 'emotion', 'claim'));
alter table public.tournament_podiums
  add column emotion_tournament_id integer,
  add column emotion_user_id integer,
  add constraint tournament_podiums_emotion_key unique (emotion_tournament_id, emotion_user_id),
  add constraint tournament_podiums_emotion_ids check ((source = 'emotion') = (emotion_tournament_id is not null and emotion_user_id is not null));

create table public.emotion_watch (
  id integer primary key,
  name text,
  starts_on date,
  checked_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index emotion_watch_open_idx on public.emotion_watch (starts_on) where not done;
alter table public.emotion_watch enable row level security;

insert into private.app_settings (name, value) values ('emotion_next_id', '575') on conflict (name) do nothing;

create or replace function public.federation_next_id(p_name text)
returns integer language sql stable security definer set search_path = '' as $$
  select (select value::integer from private.app_settings where name = p_name || '_next_id');
$$;
create or replace function public.federation_set_next_id(p_name text, p_id integer)
returns void language sql security definer set search_path = '' as $$
  update private.app_settings set value = p_id::text where name = p_name || '_next_id' and value::integer < p_id;
$$;
revoke execute on function public.federation_next_id(text) from public, anon, authenticated;
revoke execute on function public.federation_set_next_id(text, integer) from public, anon, authenticated;
grant execute on function public.federation_next_id(text) to service_role;
grant execute on function public.federation_set_next_id(text, integer) to service_role;

create or replace function public.podium_from_emotion(p_tournament integer, p_name text, p_date date, p_rows jsonb)
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
    -- Профиль: по ссылке на Emotion Games в кабинете (/players/<id>), иначе по нику (с учётом старых ников).
    v_profile := coalesce(
      (select p.id from public.profiles p
        where substring(p.links ->> 'emotion' from '/players/([0-9]+)')::integer = (x ->> 'userId')::integer limit 1),
      (select (array_agg(p.id))[1] from public.profiles p
        where lower(p.nickname) = lower(coalesce(
                (select a.canonical from public.player_aliases a where lower(a.alias) = lower(x ->> 'nickname') limit 1),
                x ->> 'nickname'))
          and substring(p.links ->> 'emotion' from '/players/([0-9]+)') is null
        having count(*) = 1));
    insert into public.tournament_podiums (profile_id, source, emotion_tournament_id, emotion_user_id, nickname,
        tournament_name, federation, played_on, place, results_url, club_name, status, decided_at)
      values (v_profile, 'emotion', p_tournament, (x ->> 'userId')::integer, left(x ->> 'nickname', 60),
        left(p_name, 200), 'Emotion Games', p_date, (x ->> 'place')::smallint,
        'https://emotion.games/ua/tournament/' || p_tournament, 'MafiaCL Prague', 'approved', now())
      on conflict (emotion_tournament_id, emotion_user_id) do update
        set profile_id = coalesce(public.tournament_podiums.profile_id, excluded.profile_id),
            place = excluded.place, tournament_name = excluded.tournament_name, played_on = excluded.played_on
      returning id into v_id;
    if private.podium_award(v_id) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.podium_from_emotion(integer, text, date, jsonb) from public, anon, authenticated;
grant execute on function public.podium_from_emotion(integer, text, date, jsonb) to service_role;

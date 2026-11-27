-- Подарок новичку (50 Respect за первую игру) — только тем, кого нет в архиве рейтингов клуба и в турнирах mafgame.
-- Старые игроки при переезде на сайт его не получают.
create or replace function private.is_club_newcomer(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile
      and (p.nickname is null or not exists (
            select 1 from public.rating_archive_rows r where lower(r.nickname) = lower(p.nickname)))
      and not exists (
            select 1 from public.mafgame_results m
            where m.profile_id = p.id or (p.nickname is not null and lower(m.nickname) = lower(p.nickname)))
  );
$$;

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
    if private.is_club_newcomer(r.profile_id) then
      perform private.respect_add(m.club_id, r.profile_id, 50, 'first_game', 'first_game', null, null);
    end if;
    perform private.referral_reward(r.profile_id);
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

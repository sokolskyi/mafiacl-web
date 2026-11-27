-- Respect новичкам и за друга.
-- 1) Приветственные 50 Respect — после первой игры (вместо 20 за первую игру).
-- 2) «Кто вас пригласил в клуб?» — новичок указывает ник того, кто его привёл; когда новичок
--    одобрен и сыграл первую игру, пригласившему автоматически +50 Respect (не больше 10 в месяц).
-- 3) При одобрении аккаунта игры последних 45 дней, сыгранные гостем под тем же ником,
--    привязываются к аккаунту — так первая игра «до регистрации» тоже засчитывается.

alter table public.profile_private
  add column referred_by uuid references public.profiles (id) on delete set null,
  add column referred_at timestamptz;
grant select (referred_by, referred_at) on public.profile_private to authenticated;

-- Новичок ли игрок: аккаунт не старше 60 дней, не больше 3 игр в клубе (с аккаунтом или гостем под этим ником),
-- нет в архиве рейтингов и в турнирах mafgame.
create or replace function private.referral_eligible(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_private pp on pp.profile_id = p.id
    where p.id = p_profile
      and pp.referred_by is null
      and p.created_at > now() - interval '60 days'
      and (select count(distinct mp.match_id) from public.match_players mp
           where mp.profile_id = p.id
              or (mp.profile_id is null and p.nickname is not null and lower(mp.name) = lower(p.nickname))) <= 3
      and (p.nickname is null or not exists (
            select 1 from public.rating_archive_rows r where lower(r.nickname) = lower(p.nickname)))
      and not exists (
            select 1 from public.mafgame_results m
            where m.profile_id = p.id or (p.nickname is not null and lower(m.nickname) = lower(p.nickname)))
  );
$$;

-- Бонус пригласившему: новичок одобрен и сыграл хотя бы одну игру. Один раз на новичка.
create or replace function private.referral_reward(p_referee uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref uuid; v_nick text; v_club bigint;
begin
  select pp.referred_by, p.nickname into v_ref, v_nick
    from public.profile_private pp join public.profiles p on p.id = pp.profile_id
    where pp.profile_id = p_referee and p.verification = 'approved';
  if v_ref is null then return false; end if;
  if not exists (select 1 from public.profiles r where r.id = v_ref and r.verification = 'approved') then return false; end if;
  if not exists (
    select 1 from public.match_players mp join public.matches m on m.id = mp.match_id
    where mp.profile_id = p_referee and m.status = 'finished'
  ) then return false; end if;
  -- Не больше 10 бонусов за друзей в месяц на одного игрока.
  if (select count(*) from public.respect_ledger
      where profile_id = v_ref and reason = 'referral' and created_at > now() - interval '30 days') >= 10 then
    return false;
  end if;
  select id into v_club from public.clubs order by id limit 1;
  return private.respect_add(v_club, v_ref, 50, 'referral', 'referral:' || p_referee, v_nick, null);
end;
$$;

-- Состояние для кабинета: можно ли указать пригласившего и кто указан.
create or replace function public.my_referral()
returns table (eligible boolean, referrer text, rewarded boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select private.referral_eligible(auth.uid()),
         (select r.nickname from public.profile_private pp join public.profiles r on r.id = pp.referred_by where pp.profile_id = auth.uid()),
         exists (select 1 from public.respect_ledger l where l.ref = 'referral:' || auth.uid());
$$;
revoke execute on function public.my_referral() from public, anon;
grant execute on function public.my_referral() to authenticated;

-- Указать, кто пригласил (один раз). Ник ищется среди одобренных игроков и старых ников (алиасов).
create or replace function public.referral_set(p_nick text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_nick text := btrim(coalesce(p_nick, ''));
  v_ref uuid; v_ref_nick text;
begin
  if v_me is null then raise exception 'forbidden'; end if;
  if v_nick = '' or char_length(v_nick) > 40 then raise exception 'not_found'; end if;
  if not private.referral_eligible(v_me) then raise exception 'not_eligible'; end if;
  select p.id, p.nickname into v_ref, v_ref_nick from public.profiles p
    where lower(p.nickname) = lower(v_nick) and p.verification = 'approved';
  if v_ref is null then
    select p.id, p.nickname into v_ref, v_ref_nick from public.player_aliases a
      join public.profiles p on lower(p.nickname) = lower(a.canonical)
      where lower(a.alias) = lower(v_nick) and p.verification = 'approved'
      limit 1;
  end if;
  if v_ref is null then raise exception 'not_found'; end if;
  if v_ref = v_me then raise exception 'self'; end if;
  if exists (select 1 from public.profile_private where profile_id = v_ref and referred_by = v_me) then
    raise exception 'self';
  end if;
  update public.profile_private set referred_by = v_ref, referred_at = now() where profile_id = v_me and referred_by is null;
  perform private.referral_reward(v_me);
  return v_ref_nick;
end;
$$;
revoke execute on function public.referral_set(text) from public, anon;
grant execute on function public.referral_set(text) to authenticated;

-- Привязать к аккаунту игры последних 45 дней, сыгранные гостем под тем же ником, и начислить за них Respect.
create or replace function private.member_link_recent_games(p_profile uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nick text; v_n integer := 0; r record;
begin
  select nickname into v_nick from public.profiles where id = p_profile and verification = 'approved';
  if v_nick is null then return 0; end if;
  for r in
    select distinct mp.match_id
    from public.match_players mp join public.matches m on m.id = mp.match_id
    where mp.profile_id is null and lower(mp.name) = lower(v_nick)
      and m.status = 'finished' and m.created_at > now() - interval '45 days'
      and not exists (select 1 from public.match_players x where x.match_id = mp.match_id and x.profile_id = p_profile)
  loop
    update public.match_players set profile_id = p_profile
      where match_id = r.match_id and profile_id is null and lower(name) = lower(v_nick);
    perform public.respect_award_match(r.match_id);
    v_n := v_n + 1;
  end loop;
  perform private.referral_reward(p_profile);
  return v_n;
end;
$$;

create or replace function public.member_decide(p_profile uuid, p_approve boolean, p_by uuid)
 returns table(verification text, member_no integer)
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_no integer;
begin
  if not exists (select 1 from public.club_staff where profile_id = p_by and role in ('owner', 'admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('member_no'));
  if p_approve then
    select p.member_no into v_no from public.profiles p where p.id = p_profile for update;
    if not found then raise exception 'not_found'; end if;
    if v_no is null then
      select coalesce(max(p.member_no), 0) + 1 into v_no from public.profiles p;
    end if;
    update public.profiles p
      set verification = 'approved', member_no = v_no, verified_at = now(), verified_by = p_by
      where p.id = p_profile;
    perform private.member_link_recent_games(p_profile);
  else
    update public.profiles p
      set verification = 'rejected', verified_at = now(), verified_by = p_by
      where p.id = p_profile and p.verification <> 'approved';
  end if;
  return query select p.verification, p.member_no from public.profiles p where p.id = p_profile;
end;
$function$;

-- Начисление за игру: приветственные 50 за первую игру (было 20) и бонус пригласившему.
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
    perform private.respect_add(m.club_id, r.profile_id, 50, 'first_game', 'first_game', null, null);
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

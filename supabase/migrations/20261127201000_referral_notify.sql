-- Сообщение бота пригласившему: «ваш друг сыграл первую игру — +50 Respect».
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reminder', 'promoted', 'table_full', 'game_cancelled', 'confirmed', 'waitlisted', 'waitlist_final', 'not_enough', 'referral_reward'));
alter table public.notifications add column about_profile_id uuid references public.profiles (id) on delete cascade;

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
  if private.respect_add(v_club, v_ref, 50, 'referral', 'referral:' || p_referee, v_nick, null) then
    insert into public.notifications (profile_id, kind, about_profile_id) values (v_ref, 'referral_reward', p_referee);
    return true;
  end if;
  return false;
end;
$$;

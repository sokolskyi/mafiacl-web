-- Верификация участников: после регистрации аккаунт ждёт одобрения клуба.
-- Одобренный получает постоянный номер (00001, 00002, …) — он не меняется при смене ника.
-- До одобрения закрыта только запись на игры; страница игрока и рейтинги работают.

alter table public.profiles
  add column verification text not null default 'pending'
    check (verification in ('pending', 'approved', 'rejected')),
  add column member_no integer unique check (member_no > 0),
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles (id) on delete set null,
  add constraint profiles_member_no_when_approved check (verification <> 'approved' or member_no is not null);
create index profiles_pending_idx on public.profiles (created_at) where verification <> 'approved';
create index profiles_verified_by_idx on public.profiles (verified_by);

-- Страна по IP при регистрации — только для проверки заявки, публично не видна.
alter table public.profile_private
  add column signup_country text check (signup_country ~ '^[A-Z]{2}$');

-- Уже зарегистрированные — одобрены, номера по порядку регистрации.
with ordered as (
  select id, row_number() over (order by created_at, id) as n from public.profiles
)
update public.profiles p
  set verification = 'approved', member_no = o.n, verified_at = now()
  from ordered o where o.id = p.id;

-- Запись на игру — только одобренным (и с сайта, и через бота, и руками).
create function private.signup_reject_unverified() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profile_id is not null
     and not exists (select 1 from public.profiles where id = new.profile_id and verification = 'approved') then
    raise exception 'not_verified' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function private.signup_reject_unverified() from public, anon, authenticated;
create trigger game_signups_reject_unverified before insert on public.game_signups
  for each row execute function private.signup_reject_unverified();

-- Решение по заявке. Права (owner/admin клуба) проверяет сервер; вызывать может только service_role.
create function public.member_decide(p_profile uuid, p_approve boolean, p_by uuid)
returns table (verification text, member_no integer)
language plpgsql security definer set search_path = '' as $$
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
  else
    update public.profiles p
      set verification = 'rejected', verified_at = now(), verified_by = p_by
      where p.id = p_profile and p.verification <> 'approved';
  end if;
  return query select p.verification, p.member_no from public.profiles p where p.id = p_profile;
end;
$$;
revoke all on function public.member_decide(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.member_decide(uuid, boolean, uuid) to service_role;

-- Заявки для админки: ник, имя, e-mail, способ входа, страна по IP.
create function public.member_requests()
returns table (
  id uuid, nickname text, display_name text, avatar_url text, created_at timestamptz,
  verification text, email text, provider text, signup_country text, telegram_linked boolean
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nickname, p.display_name, p.avatar_url, p.created_at, p.verification,
         u.email::text, coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
         pp.signup_country, pp.telegram_chat_id is not null
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profile_private pp on pp.profile_id = p.id
  where p.verification <> 'approved'
  order by p.verification, p.created_at;
$$;
revoke all on function public.member_requests() from public, anon, authenticated;
grant execute on function public.member_requests() to service_role;

-- Страна при первом входе (пишется один раз, пока заявка не рассмотрена).
create function public.record_signup_country(p_profile uuid, p_country text)
returns void
language sql security definer set search_path = '' as $$
  update public.profile_private pp set signup_country = upper(p_country)
  where pp.profile_id = p_profile and pp.signup_country is null and upper(p_country) ~ '^[A-Z]{2}$'
    and exists (select 1 from public.profiles p where p.id = p_profile and p.verification <> 'approved');
$$;
revoke all on function public.record_signup_country(uuid, text) from public, anon, authenticated;
grant execute on function public.record_signup_country(uuid, text) to service_role;

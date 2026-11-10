-- Абонементы игроков, у которых ещё нет аккаунта на сайте: записываем на ник из таблицы клуба
-- (holder_name), к аккаунту привязывает владелец/админ, когда игрок зарегистрируется.
-- Приоритет во вторник даёт только привязанный абонемент.
-- Вид «Год» — до 31.12 года покупки. Способ оплаты «другое» — для перенесённых из таблицы.

alter table public.memberships alter column profile_id drop not null;
alter table public.memberships add column holder_name text check (char_length(holder_name) between 1 and 40);
alter table public.memberships add constraint memberships_holder check (num_nonnulls(profile_id, holder_name) >= 1);

alter table public.memberships drop constraint memberships_plan_check;
alter table public.memberships add constraint memberships_plan_check check (plan in ('month', 'quarter', 'year', 'custom'));

grant insert (holder_name), update (profile_id, holder_name) on public.memberships to authenticated;

alter table public.payments drop constraint payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('cash', 'card', 'transfer', 'gopay', 'other'));

-- Оплата абонемента, ещё не привязанного к аккаунту: плательщик тоже без профиля.
drop policy "staff record manual payments" on public.payments;
create policy "staff record manual payments" on public.payments for insert to authenticated
  with check (
    method in ('cash', 'card', 'transfer')
    and recorded_by = (select auth.uid())
    and (
      (purpose = 'game'
        and (select private.has_club_role(club_id, array['owner', 'admin', 'host']))
        and exists (
          select 1 from public.game_signups s join public.games g on g.id = s.game_id
          where s.id = signup_id and g.club_id = payments.club_id
            and s.profile_id is not distinct from payments.profile_id
        ))
      or (purpose = 'membership'
        and (select private.has_club_role(club_id, array['owner', 'admin']))
        and exists (
          select 1 from public.memberships m
          where m.id = membership_id and m.club_id = payments.club_id
            and m.profile_id is not distinct from payments.profile_id
        ))
    )
  );

-- При привязке абонемента к аккаунту переносим и плательщика в его оплатах.
create or replace function private.membership_link_payments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is distinct from old.profile_id then
    update public.payments set profile_id = new.profile_id where membership_id = new.id;
  end if;
  return null;
end;
$$;
revoke execute on function private.membership_link_payments() from public, anon, authenticated;
create trigger memberships_link_payments
  after update of profile_id on public.memberships
  for each row execute function private.membership_link_payments();

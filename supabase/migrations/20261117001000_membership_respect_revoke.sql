-- Respect за абонемент списываются обратно, если абонемент перестал быть оплаченным:
-- удалён, снята отметка об оплате (платёж удалён или не «paid»), отменён оплаченный заказ.
-- Запись в журнале: reason 'adjust' (note 'membership revoked'), ref 'membership-revoke:<id>', сумма — минус начисленное.

create or replace function private.respect_membership_revoke(p_membership bigint, p_profile uuid, p_club bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_awarded integer;
begin
  -- профиль удаляется целиком (каскад) — журнал Respect уйдёт вместе с ним
  if p_profile is null or not exists (select 1 from public.profiles where id = p_profile) then return; end if;
  select coalesce(sum(amount), 0) into v_awarded
    from public.respect_ledger
    where profile_id = p_profile and ref = 'membership:' || p_membership;
  if v_awarded <= 0 then return; end if;
  perform private.respect_add(p_club, p_profile, -v_awarded, 'adjust', 'membership-revoke:' || p_membership, 'membership revoked', null);
end;
$$;

-- Оплачен ли ещё абонемент: живой заказ (не отменён) или платёж со статусом paid.
create or replace function private.membership_still_paid(p_membership bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    join public.shop_orders o on o.id = m.order_id
    where m.id = p_membership and o.status in ('paid', 'fulfilled')
  ) or exists (
    select 1 from public.payments where membership_id = p_membership and status = 'paid'
  );
$$;

create or replace function private.respect_membership_revoke_trg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare m record;
begin
  if tg_table_name = 'memberships' then
    -- tg_op = 'DELETE'
    perform private.respect_membership_revoke(old.id, old.profile_id, old.club_id);
    return null;
  elsif tg_table_name = 'payments' then
    if old.purpose = 'membership' and old.status = 'paid' and old.membership_id is not null
       and (tg_op = 'DELETE' or new.status <> 'paid') then
      select id, profile_id, club_id into m from public.memberships where id = old.membership_id;
      if found and not private.membership_still_paid(m.id) then
        perform private.respect_membership_revoke(m.id, m.profile_id, m.club_id);
      end if;
    end if;
    return null;
  elsif tg_table_name = 'shop_orders' then
    if new.status = 'cancelled' and old.status in ('paid', 'fulfilled') then
      for m in select id, profile_id, club_id from public.memberships where order_id = new.id loop
        if not private.membership_still_paid(m.id) then
          perform private.respect_membership_revoke(m.id, m.profile_id, m.club_id);
        end if;
      end loop;
    end if;
    return null;
  end if;
  return null;
end;
$$;

create trigger memberships_respect_revoke after delete on public.memberships
  for each row execute function private.respect_membership_revoke_trg();
create trigger payments_membership_respect_revoke after update of status or delete on public.payments
  for each row execute function private.respect_membership_revoke_trg();
create trigger shop_orders_membership_respect_revoke after update of status on public.shop_orders
  for each row execute function private.respect_membership_revoke_trg();

revoke execute on function private.respect_membership_revoke(bigint, uuid, bigint),
  private.membership_still_paid(bigint), private.respect_membership_revoke_trg() from public, anon, authenticated;

-- Защита от злоупотреблений: блокировка игроков клубом, лимит неоплаченных заказов,
-- автоотмена «зависших» заказов (товар возвращается на склад).

-- ---------------------------------------------------------------------------
-- Блокировки
-- ---------------------------------------------------------------------------
create table public.club_bans (
  club_id bigint not null references public.clubs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 200),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (club_id, profile_id)
);
create index club_bans_profile_idx on public.club_bans (profile_id);
create index club_bans_created_by_idx on public.club_bans (created_by);
alter table public.club_bans enable row level security;

create policy "staff see bans" on public.club_bans for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "admins ban" on public.club_bans for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])) and profile_id <> (select auth.uid()));
create policy "admins unban" on public.club_bans for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select, delete on public.club_bans to authenticated;
grant insert (club_id, profile_id, reason) on public.club_bans to authenticated;
grant all on public.club_bans to service_role;

create function private.is_banned(p_club bigint, p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.club_bans where club_id = p_club and profile_id = p_profile);
$$;
revoke execute on function private.is_banned(bigint, uuid) from public, anon, authenticated;

-- Запись на игру: заблокированного не пускаем ни с сайта, ни через бота, ни руками.
create function private.signup_reject_banned() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profile_id is not null
     and private.is_banned((select g.club_id from public.games g where g.id = new.game_id), new.profile_id) then
    raise exception 'banned' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger game_signups_reject_banned before insert on public.game_signups
  for each row execute function private.signup_reject_banned();

-- При блокировке снимаем его будущие записи и неоплаченные заказы клуба.
create function private.club_ban_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.game_signups s set status = 'cancelled'
    from public.games g
    where g.id = s.game_id and g.club_id = new.club_id and g.starts_at > now()
      and s.profile_id = new.profile_id and s.status <> 'cancelled' and s.checked_in_at is null;
  update public.shop_orders set status = 'cancelled'
    where club_id = new.club_id and profile_id = new.profile_id and status = 'pending';
  return null;
end;
$$;
create trigger club_bans_cleanup after insert on public.club_bans
  for each row execute function private.club_ban_cleanup();

-- ---------------------------------------------------------------------------
-- Заказы: не больше 3 неоплаченных; через 48 часов неоплаченный заказ отменяется
-- ---------------------------------------------------------------------------
create function private.shop_expire_orders() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.shop_orders set status = 'cancelled', note = coalesce(note, 'Автоотмена: не оплачен 48 ч')
    where status = 'pending' and created_at < now() - interval '48 hours';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function private.shop_expire_orders() from public, anon, authenticated;

create or replace function public.shop_create_order(p_club bigint, p_profile uuid, p_items jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order bigint;
  it jsonb;
  v record;
  v_qty integer;
  v_total numeric := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'invalid_items';
  end if;
  if private.is_banned(p_club, p_profile) then raise exception 'banned'; end if;
  perform private.shop_expire_orders();
  if (select count(*) from public.shop_orders
      where club_id = p_club and profile_id = p_profile and status = 'pending') >= 3 then
    raise exception 'too_many_pending';
  end if;

  insert into public.shop_orders (club_id, profile_id) values (p_club, p_profile) returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it ->> 'qty')::integer;
    if v_qty is null or v_qty not between 1 and 20 then raise exception 'invalid_items'; end if;
    select va.id as variant_id, va.label, va.stock, p.id as product_id, p.kind, p.price_czk, p.name, p.active
      into v
      from public.shop_variants va
      join public.shop_products p on p.id = va.product_id
      where va.id = (it ->> 'variantId')::bigint and p.club_id = p_club
      for update of va;
    if not found or not v.active then raise exception 'not_available'; end if;
    if v.kind = 'membership' and v_qty <> 1 then raise exception 'invalid_items'; end if;
    if v.stock is not null then
      if v.stock < v_qty then raise exception 'out_of_stock'; end if;
      update public.shop_variants set stock = stock - v_qty where id = v.variant_id;
    end if;
    insert into public.shop_order_items (order_id, product_id, variant_id, name, variant_label, qty, price_czk)
      values (v_order, v.product_id, v.variant_id, v.name, v.label, v_qty, v.price_czk);
    v_total := v_total + v.price_czk * v_qty;
  end loop;

  update public.shop_orders set total_czk = v_total where id = v_order;
  return v_order;
end;
$$;
revoke all on function public.shop_create_order(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.shop_create_order(bigint, uuid, jsonb) to service_role;

-- Раз в час отменяем зависшие заказы, даже если новых заказов нет.
create extension if not exists pg_cron;
select cron.schedule('shop-expire-orders', '17 * * * *', 'select private.shop_expire_orders()');

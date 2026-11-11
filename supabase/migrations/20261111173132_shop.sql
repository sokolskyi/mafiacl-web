-- Магазин клуба: товары (футболки, маски, чашки…) и абонементы, варианты (размер/цвет) с остатками, заказы.
-- Абонемент — обычный товар вида 'membership': после оплаты заказа абонемент выдаётся игроку автоматически.

create table public.shop_products (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  kind text not null default 'merch' check (kind in ('merch', 'membership')),
  membership_plan text check (membership_plan in ('month', 'quarter', 'year')),
  name jsonb not null check (jsonb_typeof(name) = 'object'),            -- {"cs":…,"ru":…,"uk":…,"en":…}
  description jsonb check (description is null or jsonb_typeof(description) = 'object'),
  price_czk numeric(10, 2) not null check (price_czk >= 0),
  image_url text check (image_url is null or image_url ~ '^https://'),
  active boolean not null default true,
  sort integer not null default 100,
  created_at timestamptz not null default now(),
  constraint shop_products_plan check ((kind = 'membership') = (membership_plan is not null)),
  unique (club_id, slug)
);

create table public.shop_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.shop_products (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 40),      -- «M», «чёрная»; пусто — вариант один
  stock integer check (stock is null or stock >= 0),                    -- null — без учёта остатка
  sort integer not null default 100,
  unique (product_id, label)
);
create index shop_variants_product_idx on public.shop_variants (product_id);

create table public.shop_orders (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled')),
  total_czk numeric(10, 2) not null default 0 check (total_czk >= 0),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  fulfilled_at timestamptz
);
create index shop_orders_club_created_idx on public.shop_orders (club_id, created_at desc);
create index shop_orders_profile_idx on public.shop_orders (profile_id);

create table public.shop_order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.shop_orders (id) on delete cascade,
  product_id bigint not null references public.shop_products (id) on delete restrict,
  variant_id bigint not null references public.shop_variants (id) on delete restrict,
  name jsonb not null,
  variant_label text not null default '',
  qty integer not null check (qty between 1 and 20),
  price_czk numeric(10, 2) not null check (price_czk >= 0)
);
create index shop_order_items_order_idx on public.shop_order_items (order_id);
create index shop_order_items_product_idx on public.shop_order_items (product_id);
create index shop_order_items_variant_idx on public.shop_order_items (variant_id);
create index shop_products_club_idx on public.shop_products (club_id);

-- Оплаты привязываются к заказу; абонемент, выданный из заказа, помнит заказ.
alter table public.payments add column order_id bigint references public.shop_orders (id) on delete restrict;
create index payments_order_idx on public.payments (order_id);
create unique index payments_order_paid_key on public.payments (order_id) where status in ('pending', 'paid') and order_id is not null;
alter table public.payments add constraint payments_shop_order check (purpose <> 'shop' or order_id is not null);
alter table public.memberships add column order_id bigint references public.shop_orders (id) on delete set null;
create index memberships_order_idx on public.memberships (order_id);

alter table public.shop_products enable row level security;
alter table public.shop_variants enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

-- Витрина: активные товары видят все; сотрудники (владелец/админ) — все и могут менять.
create policy "anyone sees active products" on public.shop_products for select to anon, authenticated using (active);
create policy "staff see all products" on public.shop_products for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "staff manage products" on public.shop_products for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "staff update products" on public.shop_products for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));

create policy "anyone sees variants of active products" on public.shop_variants for select to anon, authenticated
  using (exists (select 1 from public.shop_products p where p.id = product_id and p.active));
create policy "staff see all variants" on public.shop_variants for select to authenticated
  using (exists (select 1 from public.shop_products p where p.id = product_id and (select private.has_club_role(p.club_id, array['owner', 'admin']))));
create policy "staff insert variants" on public.shop_variants for insert to authenticated
  with check (exists (select 1 from public.shop_products p where p.id = product_id and (select private.has_club_role(p.club_id, array['owner', 'admin']))));
create policy "staff update variants" on public.shop_variants for update to authenticated
  using (exists (select 1 from public.shop_products p where p.id = product_id and (select private.has_club_role(p.club_id, array['owner', 'admin']))))
  with check (exists (select 1 from public.shop_products p where p.id = product_id and (select private.has_club_role(p.club_id, array['owner', 'admin']))));

-- Заказы: игрок видит свои, сотрудники — заказы клуба. Создаёт заказ только сервер (функция ниже).
create policy "players see own orders" on public.shop_orders for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "staff see club orders" on public.shop_orders for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "staff update orders" on public.shop_orders for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])) and status in ('fulfilled', 'cancelled'));

create policy "players see own order items" on public.shop_order_items for select to authenticated
  using (exists (select 1 from public.shop_orders o where o.id = order_id and o.profile_id = (select auth.uid())));
create policy "staff see club order items" on public.shop_order_items for select to authenticated
  using (exists (select 1 from public.shop_orders o where o.id = order_id and (select private.has_club_role(o.club_id, array['owner', 'admin', 'host']))));

grant select (id, club_id, slug, kind, membership_plan, name, description, price_czk, image_url, active, sort) on public.shop_products to anon, authenticated;
grant insert (club_id, slug, kind, membership_plan, name, description, price_czk, image_url, active, sort),
      update (slug, name, description, price_czk, image_url, active, sort) on public.shop_products to authenticated;
grant select (id, product_id, label, stock, sort) on public.shop_variants to anon, authenticated;
grant insert (product_id, label, stock, sort), update (label, stock, sort) on public.shop_variants to authenticated;
grant select on public.shop_orders, public.shop_order_items to authenticated;
grant update (status, note) on public.shop_orders to authenticated;
grant all on public.shop_products, public.shop_variants, public.shop_orders, public.shop_order_items to service_role;

-- Ручная отметка оплаты заказа (наличные/карта/перевод) — как для игр и абонементов.
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
          where m.id = membership_id and m.club_id = payments.club_id and m.profile_id = payments.profile_id
        ))
      or (purpose = 'shop'
        and (select private.has_club_role(club_id, array['owner', 'admin', 'host']))
        and exists (
          select 1 from public.shop_orders o
          where o.id = order_id and o.club_id = payments.club_id and o.profile_id is not distinct from payments.profile_id
            and o.status = 'pending'
        ))
    )
  );
-- Оплату заказа не снимаем: возврат — через отмену заказа.
drop policy "staff undo manual payments" on public.payments;
create policy "staff undo manual payments" on public.payments for delete to authenticated
  using (
    method in ('cash', 'card', 'transfer')
    and purpose <> 'shop'
    and (
      (select private.has_club_role(club_id, array['owner', 'admin']))
      or (recorded_by = (select auth.uid()) and (select private.has_club_role(club_id, array['host'])))
    )
  );
grant insert (order_id) on public.payments to authenticated;

-- Создание заказа: цены и остатки берём из базы, а не от покупателя; остаток резервируется сразу.
-- Вызывает только сервер (service_role) после проверки входа.
create function public.shop_create_order(p_club bigint, p_profile uuid, p_items jsonb)
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

-- Оплата заказа → заказ «оплачен» (оплата приходит от сотрудника или от GoPay через сервер).
create function private.shop_payment_to_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.purpose = 'shop' and new.status = 'paid' then
    update public.shop_orders set status = 'paid' where id = new.order_id and status = 'pending';
  end if;
  return null;
end;
$$;
create trigger shop_payment_to_order after insert or update of status on public.payments
  for each row execute function private.shop_payment_to_order();

-- Переходы статусов, отметки времени, возврат остатка при отмене, выдача абонементов при оплате.
create function private.shop_order_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'cancelled' then raise exception 'order_cancelled'; end if;
    if new.status = 'fulfilled' and old.status <> 'paid' then raise exception 'order_not_paid'; end if;
    if new.status = 'paid' then new.paid_at := now(); end if;
    if new.status = 'fulfilled' then new.fulfilled_at := now(); end if;
  end if;
  return new;
end;
$$;
create trigger shop_order_before_update before update on public.shop_orders
  for each row execute function private.shop_order_before_update();

create function private.shop_order_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_from date;
  v_until date;
  v_today date := (now() at time zone 'Europe/Prague')::date;
begin
  if new.status = old.status then return null; end if;

  if new.status = 'cancelled' then
    update public.shop_variants va set stock = va.stock + i.qty
      from public.shop_order_items i
      where i.order_id = new.id and va.id = i.variant_id and va.stock is not null;
  elsif new.status = 'paid' then
    for r in
      select p.membership_plan as plan
      from public.shop_order_items i join public.shop_products p on p.id = i.product_id
      where i.order_id = new.id and p.kind = 'membership'
    loop
      if exists (select 1 from public.memberships where order_id = new.id) then continue; end if;
      -- Если абонемент ещё действует, новый начинается на следующий день после окончания.
      select coalesce(max(valid_until) + 1, v_today) into v_from
        from public.memberships
        where club_id = new.club_id and profile_id = new.profile_id and valid_until >= v_today;
      v_until := case r.plan
        when 'year' then make_date(extract(year from v_from)::integer, 12, 31)
        when 'quarter' then (v_from + interval '3 months')::date
        else (v_from + interval '1 month')::date
      end;
      insert into public.memberships (club_id, profile_id, plan, valid_from, valid_until, note, order_id)
        values (new.club_id, new.profile_id, r.plan, v_from, v_until, 'Магазин, заказ №' || new.id, new.id);
    end loop;
  end if;
  return null;
end;
$$;
create trigger shop_order_after_update after update of status on public.shop_orders
  for each row execute function private.shop_order_after_update();

-- Абонементы клуба — сразу в магазине (цены как в таблице клуба).
insert into public.shop_products (club_id, slug, kind, membership_plan, name, description, price_czk, sort)
select c.id, v.slug, 'membership', v.plan, v.name::jsonb, v.descr::jsonb, v.price, v.sort
from public.clubs c,
  (values
    ('abonement-month', 'month',
     '{"cs":"Permanentka na 1 měsíc","ru":"Абонемент на 1 месяц","uk":"Абонемент на 1 місяць","en":"1-month membership"}',
     '{"cs":"Platí měsíc ode dne zakoupení.","ru":"Действует месяц с даты покупки.","uk":"Діє місяць з дати купівлі.","en":"Valid for a month from the purchase date."}',
     1150, 10),
    ('abonement-quarter', 'quarter',
     '{"cs":"Permanentka na 3 měsíce","ru":"Абонемент на 3 месяца","uk":"Абонемент на 3 місяці","en":"3-month membership"}',
     '{"cs":"Platí 3 měsíce ode dne zakoupení.","ru":"Действует 3 месяца с даты покупки.","uk":"Діє 3 місяці з дати купівлі.","en":"Valid for 3 months from the purchase date."}',
     3150, 20),
    ('abonement-year', 'year',
     '{"cs":"Permanentka na rok","ru":"Абонемент на год","uk":"Абонемент на рік","en":"Annual membership"}',
     '{"cs":"Platí do 31. prosince.","ru":"Действует до 31 декабря.","uk":"Діє до 31 грудня.","en":"Valid until December 31."}',
     8600, 30)
  ) as v (slug, plan, name, descr, price, sort)
where c.slug = 'mafiacl-prague';
insert into public.shop_variants (product_id, label)
select id, '' from public.shop_products where kind = 'membership';

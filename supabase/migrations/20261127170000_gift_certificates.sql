-- Подарочные сертификаты на игровые вечера: товар магазина kind = 'certificate'.
-- Покупатель вписывает, кому (имя), от кого и пожелание; после оплаты для каждой штуки
-- выпускается сертификат с уникальным кодом на 12 месяцев. Ведущий находит его по коду и списывает вечера.

alter table public.shop_products drop constraint shop_products_kind_check;
alter table public.shop_products add constraint shop_products_kind_check check (kind in ('merch', 'membership', 'certificate'));
alter table public.shop_products add column certificate_evenings smallint check (certificate_evenings between 1 and 50);
alter table public.shop_products add constraint shop_products_certificate check ((kind = 'certificate') = (certificate_evenings is not null));
grant select (certificate_evenings) on public.shop_products to anon, authenticated;
grant insert (certificate_evenings) on public.shop_products to authenticated;

alter table public.shop_order_items
  add column cert_to text check (char_length(cert_to) between 1 and 60),
  add column cert_from text check (char_length(cert_from) between 1 and 60),
  add column cert_message text check (char_length(cert_message) between 1 and 200);

create table public.gift_certificates (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^MCL-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  club_id bigint not null references public.clubs (id),
  order_id bigint references public.shop_orders (id) on delete restrict,
  order_item_id bigint references public.shop_order_items (id) on delete restrict,
  evenings smallint not null check (evenings between 1 and 50),
  used_evenings smallint not null default 0 check (used_evenings >= 0 and used_evenings <= evenings),
  recipient text not null check (char_length(recipient) between 1 and 60),
  sender text check (char_length(sender) between 1 and 60),
  message text check (char_length(message) between 1 and 200),
  valid_until date not null,
  voided_at timestamptz,
  created_at timestamptz not null default now()
);
create index gift_certificates_order_idx on public.gift_certificates (order_id);
create index gift_certificates_club_idx on public.gift_certificates (club_id, created_at desc);
alter table public.gift_certificates enable row level security;

create table public.gift_certificate_uses (
  id bigint generated always as identity primary key,
  certificate_id bigint not null references public.gift_certificates (id) on delete cascade,
  used_by uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index gift_certificate_uses_cert_idx on public.gift_certificate_uses (certificate_id);
alter table public.gift_certificate_uses enable row level security;

create policy "buyers see own certificates" on public.gift_certificates for select to authenticated
  using (exists (select 1 from public.shop_orders o where o.id = gift_certificates.order_id and o.profile_id = (select auth.uid())));
create policy "staff see club certificates" on public.gift_certificates for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));
create policy "staff see certificate uses" on public.gift_certificate_uses for select to authenticated
  using (exists (select 1 from public.gift_certificates c where c.id = gift_certificate_uses.certificate_id
    and (select private.has_club_role(c.club_id, array['owner', 'admin', 'host']))));
grant select on public.gift_certificates to authenticated;
grant select on public.gift_certificate_uses to authenticated;

-- Код вида MCL-7KQ2-XM4P (без похожих символов 0/O, 1/I/L).
create or replace function private.gift_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  a constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea := extensions.gen_random_bytes(8);
  s text := '';
begin
  for i in 0..7 loop
    s := s || substr(a, (get_byte(b, i) % length(a)) + 1, 1);
  end loop;
  return 'MCL-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
end;
$$;

-- Заказ: у сертификата обязательно «кому», остальное — по желанию.
create or replace function public.shop_create_order(p_club bigint, p_profile uuid, p_items jsonb)
 returns bigint
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_order bigint; it jsonb; v record; v_qty integer; v_total numeric := 0; v_nick text; v_color text; v_price numeric;
  v_today date := (now() at time zone 'Europe/Prague')::date;
  v_start date;
  v_to text; v_from text; v_msg text;
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
    select va.id as variant_id, va.label, va.stock, p.id as product_id, p.kind, p.name, p.active,
           p.ask_nickname, p.ask_color, p.valid_until
      into v
      from public.shop_variants va
      join public.shop_products p on p.id = va.product_id
      where va.id = (it ->> 'variantId')::bigint and p.club_id = p_club
      for update of va;
    if not found or not v.active then raise exception 'not_available'; end if;
    if v.kind = 'membership' and v_qty <> 1 then raise exception 'invalid_items'; end if;
    v_price := private.shop_price_on(v.product_id, v_today);
    if v_price is null then raise exception 'not_available'; end if;

    -- Дата начала абонемента: завтра … +90 дней; иначе — сразу после оплаты.
    v_start := null;
    if v.kind = 'membership' and coalesce(it ->> 'startOn', '') ~ '^\d{4}-\d{2}-\d{2}$' then
      begin
        v_start := (it ->> 'startOn')::date;
      exception when others then v_start := null;
      end;
      if v_start is not null and (v_start <= v_today or v_start > v_today + 90) then v_start := null; end if;
    end if;

    v_nick := nullif(left(btrim(coalesce(it ->> 'nickname', '')), 32), '');
    v_color := nullif(left(btrim(coalesce(it ->> 'color', '')), 40), '');
    if (v.ask_nickname and v_nick is null) or (v.ask_color and v_color is null) then
      raise exception 'missing_options';
    end if;
    if not v.ask_nickname then v_nick := null; end if;
    if not v.ask_color then v_color := null; end if;

    -- Сертификат: кому (обязательно), от кого и пожелание.
    v_to := null; v_from := null; v_msg := null;
    if v.kind = 'certificate' then
      v_to := nullif(left(btrim(coalesce(it ->> 'certTo', '')), 60), '');
      v_from := nullif(left(btrim(coalesce(it ->> 'certFrom', '')), 60), '');
      v_msg := nullif(left(btrim(coalesce(it ->> 'certMessage', '')), 200), '');
      if v_to is null then raise exception 'missing_options'; end if;
    end if;

    if v.stock is not null then
      if v.stock < v_qty then raise exception 'out_of_stock'; end if;
      update public.shop_variants set stock = stock - v_qty where id = v.variant_id;
    end if;
    insert into public.shop_order_items (order_id, product_id, variant_id, name, variant_label, qty, price_czk, nickname, color, membership_until, membership_from, cert_to, cert_from, cert_message)
      values (v_order, v.product_id, v.variant_id, v.name, v.label, v_qty, v_price, v_nick, v_color, v.valid_until, v_start, v_to, v_from, v_msg);
    v_total := v_total + v_price * v_qty;
  end loop;

  update public.shop_orders set total_czk = v_total where id = v_order;
  return v_order;
end;
$function$;

-- После оплаты — абонементы и сертификаты; при отмене — вернуть остатки и аннулировать сертификаты.
create or replace function private.shop_order_after_update()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record; v_from date; v_until date; v_code text;
  v_today date := (now() at time zone 'Europe/Prague')::date;
begin
  if new.status = old.status then return null; end if;

  if new.status = 'cancelled' then
    update public.shop_variants va set stock = va.stock + i.qty
      from public.shop_order_items i
      where i.order_id = new.id and va.id = i.variant_id and va.stock is not null;
    update public.gift_certificates set voided_at = now() where order_id = new.id and voided_at is null;
  elsif new.status = 'paid' then
    for r in
      select p.membership_plan as plan, i.membership_until, i.membership_from
      from public.shop_order_items i join public.shop_products p on p.id = i.product_id
      where i.order_id = new.id and p.kind = 'membership'
    loop
      if exists (select 1 from public.memberships where order_id = new.id) then continue; end if;
      -- Начало: выбранная дата, но не раньше сегодня и не раньше конца действующего абонемента.
      select greatest(coalesce(max(valid_until) + 1, v_today), coalesce(r.membership_from, v_today), v_today) into v_from
        from public.memberships
        where club_id = new.club_id and profile_id = new.profile_id and valid_until >= v_today;
      v_until := case r.plan
        when 'year' then greatest(coalesce(r.membership_until, make_date(extract(year from v_from)::integer, 12, 31)), v_from)
        when 'quarter' then (v_from + interval '3 months')::date
        else (v_from + interval '1 month')::date
      end;
      insert into public.memberships (club_id, profile_id, plan, valid_from, valid_until, note, order_id)
        values (new.club_id, new.profile_id, r.plan, v_from, v_until, 'Магазин, заказ №' || new.id, new.id);
    end loop;

    -- Сертификаты: по одному на каждую штуку, выпускаются один раз.
    if not exists (select 1 from public.gift_certificates where order_id = new.id) then
      for r in
        select i.id as item_id, i.qty, i.cert_to, i.cert_from, i.cert_message, p.certificate_evenings as evenings
        from public.shop_order_items i join public.shop_products p on p.id = i.product_id
        where i.order_id = new.id and p.kind = 'certificate'
      loop
        for n in 1..r.qty loop
          loop
            v_code := private.gift_code();
            exit when not exists (select 1 from public.gift_certificates where code = v_code);
          end loop;
          insert into public.gift_certificates (code, club_id, order_id, order_item_id, evenings, recipient, sender, message, valid_until)
            values (v_code, new.club_id, new.id, r.item_id, r.evenings, coalesce(r.cert_to, '—'), r.cert_from, r.cert_message,
              (v_today + interval '12 months')::date);
        end loop;
      end loop;
    end if;
  end if;
  return null;
end;
$function$;

-- Ведущий / администрация клуба списывает вечер по коду.
create or replace function public.gift_certificate_redeem(p_code text, p_note text default null)
returns table (code text, recipient text, evenings smallint, used_evenings smallint, valid_until date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.gift_certificates;
  v_today date := (now() at time zone 'Europe/Prague')::date;
begin
  select * into c from public.gift_certificates g where g.code = upper(btrim(p_code)) for update;
  if not found then raise exception 'not_found'; end if;
  if not private.has_club_role(c.club_id, array['owner', 'admin', 'host']) then raise exception 'forbidden'; end if;
  if c.voided_at is not null then raise exception 'voided'; end if;
  if c.valid_until < v_today then raise exception 'expired'; end if;
  if c.used_evenings >= c.evenings then raise exception 'used_up'; end if;
  update public.gift_certificates g set used_evenings = g.used_evenings + 1 where g.id = c.id;
  insert into public.gift_certificate_uses (certificate_id, used_by, note) values (c.id, auth.uid(), nullif(left(btrim(coalesce(p_note, '')), 200), ''));
  return query select g.code, g.recipient, g.evenings, g.used_evenings, g.valid_until from public.gift_certificates g where g.id = c.id;
end;
$$;
revoke execute on function public.gift_certificate_redeem(text, text) from public, anon;
grant execute on function public.gift_certificate_redeem(text, text) to authenticated;

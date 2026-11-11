-- Магазин: персонализация (ник на вещи, свой цвет), несколько фото товара, хранилище фото.

-- Фото: https-ссылка или путь на нашем же сайте (/merch/…).
create function private.is_image_ref(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p ~ '^https://[^\s]+$' or p ~ '^/[a-z0-9][a-z0-9/_.-]*\.(webp|jpg|jpeg|png|avif)$';
$$;
create function private.all_image_refs(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(private.is_image_ref(x)), true) from unnest(p) as x;
$$;

alter table public.shop_products drop constraint shop_products_image_url_check;
alter table public.shop_products
  add constraint shop_products_image_url_check check (image_url is null or private.is_image_ref(image_url)),
  add column gallery text[] not null default '{}' check (cardinality(gallery) <= 12 and private.all_image_refs(gallery)),
  add column ask_nickname boolean not null default false,
  add column ask_color boolean not null default false;

grant select (gallery, ask_nickname, ask_color) on public.shop_products to anon, authenticated;
grant insert (gallery, ask_nickname, ask_color), update (gallery, ask_nickname, ask_color) on public.shop_products to authenticated;

alter table public.shop_order_items
  add column nickname text check (char_length(nickname) between 1 and 32),
  add column color text check (char_length(color) between 1 and 40);

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
  v_nick text;
  v_color text;
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
    select va.id as variant_id, va.label, va.stock, p.id as product_id, p.kind, p.price_czk, p.name, p.active,
           p.ask_nickname, p.ask_color
      into v
      from public.shop_variants va
      join public.shop_products p on p.id = va.product_id
      where va.id = (it ->> 'variantId')::bigint and p.club_id = p_club
      for update of va;
    if not found or not v.active then raise exception 'not_available'; end if;
    if v.kind = 'membership' and v_qty <> 1 then raise exception 'invalid_items'; end if;

    v_nick := nullif(left(btrim(coalesce(it ->> 'nickname', '')), 32), '');
    v_color := nullif(left(btrim(coalesce(it ->> 'color', '')), 40), '');
    if (v.ask_nickname and v_nick is null) or (v.ask_color and v_color is null) then
      raise exception 'missing_options';
    end if;
    if not v.ask_nickname then v_nick := null; end if;
    if not v.ask_color then v_color := null; end if;

    if v.stock is not null then
      if v.stock < v_qty then raise exception 'out_of_stock'; end if;
      update public.shop_variants set stock = stock - v_qty where id = v.variant_id;
    end if;
    insert into public.shop_order_items (order_id, product_id, variant_id, name, variant_label, qty, price_czk, nickname, color)
      values (v_order, v.product_id, v.variant_id, v.name, v.label, v_qty, v.price_czk, v_nick, v_color);
    v_total := v_total + v.price_czk * v_qty;
  end loop;

  update public.shop_orders set total_czk = v_total where id = v_order;
  return v_order;
end;
$$;
revoke all on function public.shop_create_order(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.shop_create_order(bigint, uuid, jsonb) to service_role;

-- Фото товаров: публичное хранилище. Загрузка — только через подписанные ссылки,
-- которые выдаёт сервер владельцу/админу клуба; прямой записи у посетителей нет.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop', 'shop', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

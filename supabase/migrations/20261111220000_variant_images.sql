-- Свои фото у варианта (например, у каждой чашки — свои картинки).
alter table public.shop_variants
  add column images text[] not null default '{}' check (cardinality(images) <= 12 and private.all_image_refs(images));
grant select (images) on public.shop_variants to anon, authenticated;
grant insert (images), update (images) on public.shop_variants to authenticated;

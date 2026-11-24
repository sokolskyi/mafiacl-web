-- Права на чтение/запись выданы по колонкам — новая колонка их не получает сама.
grant select (instagram_url) on public.partners to anon, authenticated;
grant insert (instagram_url), update (instagram_url) on public.partners to authenticated;

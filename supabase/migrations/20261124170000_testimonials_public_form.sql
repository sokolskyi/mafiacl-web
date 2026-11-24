-- Отзывы с сайта: любой посетитель оставляет отзыв (имя, компания/организация, фото, текст).
-- Отзыв приходит скрытым (active = false) — показывает его администрация клуба из админки.
alter table public.testimonials drop constraint testimonials_kind_check;
alter table public.testimonials add constraint testimonials_kind_check check (kind in ('corporate', 'player'));
alter table public.testimonials
  add column source text not null default 'admin' check (source in ('admin', 'site')),
  add column site_locale text check (char_length(site_locale) <= 5),
  add column ip_hash text check (char_length(ip_hash) <= 64);
create index testimonials_ip_idx on public.testimonials (ip_hash, created_at) where ip_hash is not null;

-- Пометку «с сайта» видит админка; ip_hash и язык — только сервер.
grant select (source, created_at) on public.testimonials to authenticated;

-- Фото авторов отзывов: публичное хранилище, запись только с сервера (сервисный ключ).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('testimonials', 'testimonials', true, 1048576, array['image/webp'])
on conflict (id) do nothing;

-- Заявки на франшизу — в той же таблице заявок, что и корпоративы.
alter table public.corporate_requests
  add column kind text not null default 'corporate' check (kind in ('corporate', 'franchise')),
  add column city text check (char_length(city) <= 80),
  add column details jsonb check (details is null or jsonb_typeof(details) = 'object');
grant select (kind, city, details) on public.corporate_requests to authenticated;

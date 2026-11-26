-- Отзыв: какой ведущий вёл игру (необязательно). Посетитель выбирает из ведущих клуба в форме на сайте.
alter table public.testimonials
  add column host_id bigint references public.hosts (id) on delete set null;
create index testimonials_host_idx on public.testimonials (host_id) where host_id is not null;

-- Ведущий отзыва виден на сайте и в админке.
grant select (host_id) on public.testimonials to anon, authenticated;

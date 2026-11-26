-- Отзыв: логотип компании/организации (необязательно). Загружает автор в форме на сайте или администрация в админке.
alter table public.testimonials
  add column company_logo_url text check (char_length(company_logo_url) <= 500);

grant select (company_logo_url) on public.testimonials to anon, authenticated;
grant insert (company_logo_url), update (company_logo_url) on public.testimonials to authenticated;

-- Администрация клуба выставляет ведущего у отзыва в админке.
grant insert (host_id), update (host_id) on public.testimonials to authenticated;

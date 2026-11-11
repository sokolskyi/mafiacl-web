-- Ссылка «подробнее» может вести на готовую страницу на нашем же домене (/mcl/, /seasons/12) —
-- тогда страница турнира открывает её вместо своей.
alter table public.tournaments drop constraint tournaments_info_url_check;
alter table public.tournaments add constraint tournaments_info_url_check
  check (info_url is null or info_url ~ '^https://[^\s]+$' or info_url ~ '^/[a-z0-9/_.-]*$');

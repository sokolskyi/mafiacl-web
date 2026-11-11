-- Турниры: валюта взноса, призовой фонд, призёры, ссылка «подробнее» (таблицы, рейтинг).
alter table public.tournaments
  add column currency text not null default 'CZK' check (currency in ('CZK', 'EUR')),
  add column prize_fund numeric(10, 2) check (prize_fund >= 0),
  add column winners text[] not null default '{}' check (cardinality(winners) <= 10),
  add column info_url text check (info_url is null or info_url ~ '^https://[^\s]+$');
grant select (currency, prize_fund, winners, info_url) on public.tournaments to anon, authenticated;
grant insert (currency, prize_fund, winners, info_url), update (currency, prize_fund, winners, info_url) on public.tournaments to authenticated;

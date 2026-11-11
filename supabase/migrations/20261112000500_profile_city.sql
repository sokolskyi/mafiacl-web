-- Город игрока (виден в профиле).
alter table public.profiles add column city text check (char_length(city) between 1 and 60);
grant select (city) on public.profiles to anon, authenticated;
grant update (city) on public.profiles to authenticated;

-- Проект создан со старыми правами по умолчанию: anon и authenticated получали ВСЕ
-- права (включая TRUNCATE, на который RLS не действует) на каждую новую таблицу.
-- Снимаем их и оставляем только явный список из core_schema.
-- Новые таблицы теперь тоже без прав по умолчанию: GRANT пишем явно в каждой миграции.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;

-- Чтение
grant select on public.countries, public.cities, public.clubs, public.venues,
  public.profiles, public.club_staff, public.games, public.game_signups, public.tournaments
  to anon, authenticated;
grant select on public.profile_private to authenticated;

-- Запись (какие строки — решает RLS; какие колонки — эти списки)
grant update (name, status, founded_on) on public.clubs to authenticated;
grant insert (club_id, name, address, maps_url, is_active),
      update (name, address, maps_url, is_active),
      delete on public.venues to authenticated;
grant update (nickname, display_name, avatar_url, locale, home_club_id) on public.profiles to authenticated;
grant update (phone, telegram_chat_id, marketing_consent) on public.profile_private to authenticated;
grant insert (club_id, profile_id, role), delete on public.club_staff to authenticated;
grant insert (club_id, venue_id, host_profile_id, starts_at, kind, status, capacity, price_czk, note, created_by),
      update (venue_id, host_profile_id, starts_at, kind, status, capacity, price_czk, note),
      delete on public.games to authenticated;
grant insert (game_id, profile_id, guest_name, status, added_by),
      update (status, guest_name),
      delete on public.game_signups to authenticated;
grant insert (club_id, slug, name, series, status, starts_on, ends_on),
      update (slug, name, series, status, starts_on, ends_on),
      delete on public.tournaments to authenticated;

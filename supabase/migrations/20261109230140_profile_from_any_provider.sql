-- Профиль из данных любого провайдера: Google (full_name, avatar_url),
-- Facebook (name, picture), Telegram OIDC (name, preferred_username, picture).
-- Telegram не отдаёт e-mail — в профиль он и не нужен.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(m ->> 'full_name', m ->> 'name', m ->> 'preferred_username', m ->> 'user_name'), 80),
    coalesce(m ->> 'avatar_url', m ->> 'picture')
  );
  insert into public.profile_private (profile_id) values (new.id);
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

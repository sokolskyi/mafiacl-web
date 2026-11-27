-- iMafia отвечает серверу сайта 404 (закрыт от автоматических запросов): автоимпорт выключен,
-- пока iMafia не откроет доступ. Включить: update private.app_settings set value = 'true' where name = 'imafia_auto';
insert into private.app_settings (name, value) values ('imafia_auto', 'false') on conflict (name) do nothing;

create or replace function public.app_flag(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select value = 'true' from private.app_settings where name = p_name and p_name in ('imafia_auto')), false);
$$;
revoke execute on function public.app_flag(text) from public, anon, authenticated;
grant execute on function public.app_flag(text) to service_role;

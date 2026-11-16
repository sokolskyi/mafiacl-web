-- Сброс кеша сайта после правок прямо в базе — без пустых коммитов и пересборки.
-- Использование: select private.site_revalidate(array['partners', 'hall-archive']);
--                select private.site_revalidate();  -- сбросить всё
insert into private.app_settings (name, value) values
  ('revalidate_url', 'https://mafiacl-web.vercel.app/api/cron/revalidate')
on conflict (name) do nothing;

create or replace function private.site_revalidate(p_tags text[] default '{}')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  return net.http_post(
    url := (select value from private.app_settings where name = 'revalidate_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from private.app_settings where name = 'cron_secret')
    ),
    body := jsonb_build_object('tags', to_jsonb(coalesce(p_tags, '{}'))),
    timeout_milliseconds := 20000
  );
end;
$$;
revoke execute on function private.site_revalidate(text[]) from public, anon, authenticated;

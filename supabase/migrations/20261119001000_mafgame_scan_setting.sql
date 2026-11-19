-- Сколько новых id mafgame просматривать за один проход (для первичной загрузки — больше, потом 30).
insert into private.app_settings (name, value) values ('mafgame_scan', '30') on conflict (name) do nothing;

create or replace function private.kick_mafgame_import()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := (select value from private.app_settings where name = 'mafgame_import_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from private.app_settings where name = 'cron_secret')
    ),
    body := jsonb_build_object('scan', coalesce((select value::integer from private.app_settings where name = 'mafgame_scan'), 30)),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke execute on function private.kick_mafgame_import() from public, anon, authenticated;

-- Прогрев Kings: холостой GET перед POST — pg_net через раз рвёт старое HTTP/2-соединение с Vercel
-- («Error in the HTTP2 framing layer»), как и у импорта mafgame.
create or replace function private.kick_kings_warm()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_get(url := (select value from private.app_settings where name = 'kings_warm_url'), timeout_milliseconds := 10000);
  perform net.http_post(
    url := (select value from private.app_settings where name = 'kings_warm_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from private.app_settings where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;
revoke execute on function private.kick_kings_warm() from public, anon, authenticated;

-- Прогрев раздела MafiaCL Kings: каждые 5 минут сайт обновляет в кеше страницу текущего сезона
-- (старое приложение собирает её 5–8 секунд — посетитель её ждать не должен). См. api/cron/kings-warm.
insert into private.app_settings (name, value)
values ('kings_warm_url', 'https://mafiacl-web.vercel.app/api/cron/kings-warm')
on conflict (name) do nothing;

create or replace function private.kick_kings_warm()
returns void language plpgsql security definer set search_path = '' as $$
begin
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
select cron.schedule('kings-warm', '*/5 * * * *', 'select private.kick_kings_warm()');

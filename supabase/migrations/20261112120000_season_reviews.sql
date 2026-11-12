-- Ежемесячные обзоры сезона: снимок всех текущих рейтингов клуба за месяц.
-- Пишет только сайт служебным ключом (по будильнику из базы или по кнопке владельца в админке).

create table public.season_reviews (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  published boolean not null default true,
  generated_at timestamptz not null default now(),
  unique (club_id, month)
);
alter table public.season_reviews enable row level security;

create policy "published reviews are public" on public.season_reviews for select to anon, authenticated using (published);
create policy "admins see reviews" on public.season_reviews for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins hide reviews" on public.season_reviews for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select (id, club_id, month, data, published, generated_at) on public.season_reviews to anon, authenticated;
grant update (published) on public.season_reviews to authenticated;
grant all on public.season_reviews to service_role;

-- Будильник: 1-го числа каждого месяца в 07:13 UTC сайт собирает обзор за прошедший месяц.
insert into private.app_settings (name, value) values
  ('season_review_url', 'https://mafiacl-web.vercel.app/api/cron/season-review')
on conflict (name) do nothing;

create or replace function private.kick_season_review()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := (select value from private.app_settings where name = 'season_review_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from private.app_settings where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;
revoke execute on function private.kick_season_review() from public, anon, authenticated;

select cron.schedule('season-review', '13 7 1 * *', $$select private.kick_season_review()$$);

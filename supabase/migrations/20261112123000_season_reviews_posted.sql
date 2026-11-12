-- Когда обзор ушёл в Telegram-канал MafiaCL Kings (чтобы не отправить дважды).
alter table public.season_reviews add column posted_at timestamptz;
grant select (posted_at) on public.season_reviews to authenticated;

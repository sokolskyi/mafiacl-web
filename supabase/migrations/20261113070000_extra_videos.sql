-- Отдельные видео турниров (трансляции по дням с канала Mafs) и плейлисты MCL.
-- Применено через MCP (extra_videos); данные — см. миграцию в базе.
alter table public.hall_of_fame add column if not exists videos jsonb not null default '[]'::jsonb;
alter table public.tournaments add column if not exists videos jsonb not null default '[]'::jsonb;
alter table public.hall_of_fame add constraint hall_of_fame_videos_array check (jsonb_typeof(videos) = 'array');
alter table public.tournaments add constraint tournaments_videos_array check (jsonb_typeof(videos) = 'array');

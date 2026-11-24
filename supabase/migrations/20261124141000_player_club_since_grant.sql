-- В проекте новые таблицы не получают права для anon/authenticated автоматически.
grant select on public.player_club_since to anon, authenticated;
select private.site_revalidate(array['player-aliases']);

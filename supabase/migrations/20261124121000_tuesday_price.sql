-- Вторничные мини-турниры MafiaCL Prague стоят 300 Kč, как воскресная Arena.
update public.game_schedules s
set price_czk = 300
from public.clubs c
where c.id = s.club_id and c.slug = 'mafiacl-prague' and s.weekday = 2 and s.price_czk is null;

update public.games g
set price_czk = 300
from public.game_schedules s
where s.id = g.schedule_id and s.weekday = 2 and s.club_id = g.club_id
  and g.starts_at > now() and g.price_czk is null
  and exists (select 1 from public.clubs c where c.id = g.club_id and c.slug = 'mafiacl-prague');

select private.site_revalidate(array['games']);

-- Зал славы: сверка с mafgame.org (организатор — Mafia club "Champions League" Prague, club_id 4).
update public.hall_of_fame set note = note || '; финальная серия — Antonio, Spice, Batko'
 where title = 'IV сезон MafiaCL Prague · Premier League' and note not like '%финальная серия%';

insert into public.hall_of_fame (club_id, city, year, category, title, season, places, note, sort)
select c.id, v.city, v.year, v.category, v.title, v.season, v.places, v.note, v.sort from public.clubs c, (values
('Прага',2024,'tournament','City League: Prague – Wien',null::text,array['Ух-ты','Ticket','Лиса']::text[],'серия против венского клуба ÖMAFIA'::text,288),
('Прага',2024,'tournament','Mafia Champions League Europe 2024',null,array['Буржуй','VVince','Палац "Україна"'],'призовой фонд 1500 $',289),
('Прага',2025,'tournament','Game of Masks 2025',null,array['Miss Love','Memphis','Yokai'],'20 участников; командный зачёт — YAML Amor',290),
('Прага',2025,'tournament','MafiaCl First League 2025 — финал',null,array['Kleo','Selenix','Весна'],'II сезон First League',291),
('Прага',2025,'tournament','MafiaCl Liga Mova 2025 — финал',null,array['Annvie','Liqui','Spice'],null,292),
('Прага',2026,'tournament','Central Euro Cup 2026',null,array['Lюц','Магнат','aptah'],'финал серии, призовой фонд 2000 €; MVP — Lюц',293)
) as v(city, year, category, title, season, places, note, sort) where c.slug = 'mafiacl-prague';

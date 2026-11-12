-- Зал славы: дополнение по таблицам ФИИМ (fiim.world): Кубок Слобожанщины 2014 и 2020, MafiaCl Championship 2014, турниры клуба в Праге 2023–2024.
update public.hall_of_fame set places = array['Кертис','Дин','Персик'], note = '20 участников'
 where title = 'MafiaCl Championship 2014';

insert into public.hall_of_fame (club_id, city, year, category, title, season, places, note, sort)
select c.id, v.city, v.year, v.category, v.title, v.season, v.places, v.note, v.sort from public.clubs c, (values
('Харьков',2014,'tournament','Кубок Слобожанщины 2014',null::text,array['Аниморф','Доктор Шелдон','Holder']::text[],'1-й турнир, 40 участников'::text,262),
('Харьков',2020,'tournament','Кубок Слобожанщины 2020',null,array['Марта','Snow','Клото'],'40 участников',263),
('Прага',2023,'tournament','Central Cup 2023',null,array['Рауль','OreoN','Beska'],'40 участников',264),
('Прага',2023,'tournament','Командный чемпионат Европы 2023',null,array['шо маємо, то маємо','Только пожалуйста не название "3 якоря и госпожа КСЮША"','у БАРА'],'командный турнир, 40 участников',265),
('Прага',2024,'tournament','Турнир победителей MafiaCl 2024',null,array['Рауль','Отец','Apachе'],'20 участников',266)
) as v(city, year, category, title, season, places, note, sort) where c.slug = 'mafiacl-prague';

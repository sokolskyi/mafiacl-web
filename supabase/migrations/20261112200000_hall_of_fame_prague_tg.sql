-- Зал славы: MafiaCL Prague по каналу t.me/mafia_clp — сезоны II–IV, турниры 2022–2026, мини-турниры I–V сезонов.
insert into public.hall_of_fame (club_id, city, year, category, title, season, places, note, sort)
select c.id, v.city, v.year, v.category, v.title, v.season, v.places, v.note, v.sort from public.clubs c, (values
('Прага',2023,'season','II сезон MafiaCL Prague','II'::text,array['YeS','Остин','Рауль']::text[],'финал 25.02.2024, 150 рейтинговых игр; MVP — YeS'::text,270),
('Прага',2024,'season','III сезон MafiaCL Prague · Premier League','III',array['Рауль','PRO|kuror','Остин'],'129 рейтинговых игр; MVP — Рауль',271),
('Прага',2025,'season','IV сезон MafiaCL Prague · Premier League','IV',array['YeS','PRO|kuror','Остин'],'303 рейтинговые игры, призовой фонд 6060 Kč; MVP — Рауль',272),
('Прага',2022,'tournament','Турнир победителей мини-турниров',null,array['Добряк','Рауль','Шкет'],'8 игр, 17.12.2022',273),
('Прага',2023,'tournament','Mafia Champions League Europe 2022/2023',null,array['Рауль','Гармония','Сын'],'призовой фонд 500 €, 116 игр за сезон',274),
('Прага',2024,'tournament','MafiaCl Championship 2024',null,array['Deid_Ara','f5','Yokai'],'призовой фонд 1000 $ от Mafgame; MVP — f5',275),
('Прага',2025,'tournament','Турнир победителей MafiaCl 2025',null,array['Korolevich','Рауль','Жменька'],'MVP — Yokai',276),
('Прага',2025,'tournament','MafiaCl Championship 2025',null,array['Yokai','Jane','Рауль'],'MVP — Jane',277),
('Прага',2025,'tournament','Central Cup 2025',null,array['DOVOD','Maverick','Не Злая'],'призовой фонд 1000 €; MVP — DOVOD',278),
('Прага',2025,'tournament','Czech me hard 2025',null,array['Амо','Sometimes','Сетас'],'30 участников; MVP — f5',279),
('Прага',2025,'tournament','Mafia Champions League Europe 2025',null,array['VVince','YeS','Sэm'],'призовой фонд 2700 €, 236 игр за сезон',280),
('Прага',2025,'tournament','MafiaCl Kings 2025',null,array['DOVOD','YeS','Саботаж'],'итоговый турнир года, призовой фонд 1000 €; MVP — Саботаж',281),
('Прага',2026,'tournament','Турнир победителей MafiaCl 2026',null,array['Tops','Maverick','Korolevich'],'MVP — Синичкин',282),
('Прага',2026,'tournament','MafiaCl Championship 2026',null,array['Landing','f5','Виталий'],'MVP — Landing',283),
('Прага',2026,'tournament','Битва Чемпионов 2026',null,array['Логика','Сью','Season''s'],'MVP — Логика',284),
('Прага',2026,'tournament','MafiaCl Protocol 4 2026',null,array['DOVOD','Буржуй','Люсі'],'парный зачёт — Гармония и DOVOD; MVP — DOVOD',285),
('Прага',2026,'tournament','Mafgame Mafia World Championship 2026',null,array['Призрак','RAMZES','Сью'],'первый чемпионат мира Mafgame, 12–13.09.2026 в Праге, 13 стран; MVP — RAMZES',286),
('Прага',2026,'tournament','Four Seasons: Central Cup 2026',null,array['Korolevich','aptah','Tops'],'MVP — Korolevich',287)
) as v(city, year, category, title, season, places, note, sort) where c.slug = 'mafiacl-prague';

insert into public.hall_of_fame (club_id, city, year, category, title, season, places, sort)
select c.id, 'Прага', m.year, 'mini', m.num, m.season, array[m.name], m.sort
from public.clubs c,
(select s.season, s.year, split_part(t.item,' ',1) as num, substr(t.item, strpos(t.item,' ')+1) as name, s.base + t.ord::int as sort
 from (values
 ('I',2022,1300,'I Рауль;II Рауль;III Гармония;IV Ух-ты;V Север;VI Joi;VII Рауль;VIII Лев;IX Stoum;X PRO|kuror;XI Шкет;XII Лев;XIII Scorp;XIV Добряк;XV Yokai;XVI Добряк;XVII Бартоломью;XVIII Остин;XIX Лето;XX Бартоломью;XXI Остин;XXII Коннор и Чешир'),
 ('II',2023,1340,'I Остин;II Шкет;III YeS;IV YeS;V Чешир;VI Dancy;VII Сказочник;VIII Рамона;IX YeS;X Рамона;XI Полицейский и Grelle;XII Гармония;XIII Полицейский;XIV Полицейский;XV Остин;XVI Север;XVII Picasso;XVIII Полицейский;XIX Остин;XX MorningStar;XXI Миф;XXII Рауль;XXIII Franklin;XXIV Picasso;XXV Лиса;XXVI PRO|kuror;XXVII Рамона;XXVIII Рауль;XXIX Apache;XXX Лев;XXXI Рамона;XXXII Ух-ты;XXXIII Берлин;XXXIV Соль;XXXV Sometimes'),
 ('III',2024,1380,'I Остин;II Север;III Apache;IV Yokai;V Yokai;VI Север;VII Остин;VIII Рауль;IX Рауль;X PRO|kuror;XI Рауль;XII Yokai;XIII PRO|kuror;XIV Лиса;XV Остин;XVI Batko;XVII PRO|kuror;XVIII Korolevich;XIX Рауль;XX PRO|kuror;XXI Лана;XXII Лана;XXIII Рауль;XXIV YeS;XXV Espresso Martini;XXVI PRO|kuror;XXVII Жених;XXVIII Логика;XXIX Рауль;XXX Antonio'),
 ('IV',2025,1420,'I Рауль;II Batko;III Sansa;IV Yokai;V Лиса;VI qUAest0r;VII Yokai;VIII Link;IX Classika;X Classika;XI Лиса;XII Antonio;XIII Остин;XIV Maverick;XV Рауль;XVI Spice;XVII Tops;XVIII Duff;XIX Амо;XX Джек;XXI Рауль;XXII PRO|kuror;XXIII Dara;XXIV Batko;XXV Duff;XXVI Antonio;XXVII Остин;XXVIII Batko;XXIX Рауль;XXX Spice;XXXI Maverick;XXXII Четырехглазый;XXXIII mobi.;XXXIV PRO|kuror;XXXV Batko;XXXVI Antonio;XXXVII Miss Belle;XXXVIII Antonio;XXXIX YeS;XL Рауль;XLI Batko;XLII Spice'),
 ('V',2026,1470,'I Antonio;II Kramola;III Джек;IV Yokai;V Batko;VI MorningStar;VII Tops;VIII Рауль;IX Gre4a;X DOVOD и PRO|kuror;XI Остин;XII Люсі;XIII PRO|kuror;XIV Люсі и Link;XV W;XVI Гармония;XVII PRO|kuror;XVIII Север;XIX Antonio;XX PRO|kuror;XXI Tops;XXII Nobody;XXIII Tops;XXIV Tops;XXV Gre4a;XXVI DOVOD;XXVII Tops;XXVIII Gre4a;XXIX PRO|kuror;XXX Tops;XXXI Берлин;XXXII DonValeron;XXXIII Tops;XXXIV Link;XXXV Stockholm;XXXVI Gre4a;XXXVII Берлин;XXXVIII PRO|kuror')
 ) as s(season, year, base, list),
 lateral unnest(string_to_array(s.list,';')) with ordinality as t(item, ord)) m
where c.slug = 'mafiacl-prague';

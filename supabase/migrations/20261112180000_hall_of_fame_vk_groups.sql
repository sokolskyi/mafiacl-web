-- Зал славы: сверка с тематическими группами ВК (clksm, mafiaclmt, mclcup, mafclmarafon, ustcl, mafiaclchampionship, clmcl).
-- Мини-турниры IV–VI сезонов заменяются полными списками из группы мини-турниров; добавлены VII, VIII и IX (2019) сезоны.
delete from public.hall_of_fame where category = 'mini' and season in ('IV','V','VI','VII','VIII') ;
delete from public.hall_of_fame where category = 'mini' and season = 'IX' and year = 2019;

update public.hall_of_fame set places = array['Вольфрам','Flash','Ятна'], note = 'призовой фонд 4500 грн, 40 игр'
 where title = 'MafiaCl Championship 2018';
update public.hall_of_fame set note = '105 игр за сезон' where title = 'Mafia Champions League 2016/2017';
update public.hall_of_fame set note = 'призовой фонд 5000 грн, 105 игр за сезон' where title = 'Mafia Champions League 2017/2018';
update public.hall_of_fame set places = array['Борщ','Гармония','Blink'], note = 'к 5-летию клуба; парный зачёт — Борщ и Snow'
 where title = 'MafiaCl Kharkiv Cup 2017';
update public.hall_of_fame set places = array['Гармония','Шершень','Dons'], note = 'к 6-летию клуба; парный зачёт — Dons и Октава'
 where title = 'MafiaCl Kharkiv Cup 2018';
update public.hall_of_fame set note = '80 участников; лучший шериф — Flash, лучший дон — Рыжая, самый культурный — Костер'
 where title = 'Кубок Слобожанщины 2017';
update public.hall_of_fame set note = '80 участников; лучший шериф — Амахонда, лучший дон — 22, самый культурный — Гармония'
 where title = 'Кубок Слобожанщины 2018';
update public.hall_of_fame set note = '2-й турнир победителей, декабрь 2013'
 where title = 'Турнир победителей мини-турниров' and year = 2013;

insert into public.hall_of_fame (club_id, city, year, category, title, season, places, note, sort)
select c.id, v.city, v.year, v.category, v.title, v.season, v.places, v.note, v.sort from public.clubs c, (values
('Харьков',2012,'tournament','Турнир победителей мини-турниров',null::text,array['Мирон Богданович']::text[],'1-й турнир победителей'::text,240),
('Харьков',2014,'tournament','MafiaCl Championship 2014',null,array['Кертис'],null,241),
('Харьков',2015,'tournament','MafiaCl Championship 2015',null,array['Артист','Ятна','Flash'],'3-й ежегодный турнир, 44 игры',242),
('Харьков',2015,'tournament','MafiaCl Kharkiv Cup 2015',null,array['RiT','Шкода','Барселлино'],'к 3-летию клуба; парный зачёт — Амахонда и Оливка',243),
('Харьков',2016,'tournament','MafiaCl Championship 2016',null,array['Lucky','Бенджамин','Artykartoshechka'],'4-й ежегодный турнир, 44 игры',244),
('Харьков',2016,'tournament','MafiaCl Kharkiv Cup 2016',null,array['RiT','Кика','Trevery'],'к 4-летию клуба; парный зачёт — Дин и Полицейский',245),
('Харьков',2016,'tournament','Турнир победителей мини-турниров',null,array['Trevery'],'3-й турнир победителей, 30.04.2016',246),
('Харьков',2016,'tournament','Маф-марафон 2016',null,array['Хохольчик и Марта'],'парный турнир на 24 часа, 27 игр',247),
('Харьков',2017,'tournament','Маф-марафон 2017',null,array['Анархия и Lynch','Бенджамин и Ginger','YeS и Морф'],'27 игр за 25 часов; больше всех баллов в личном зачёте — YeS',248),
('Харьков',2017,'tournament','Ukrainian Students Tournament 2017',null,array['Анархия','Леди Бу','Superman'],null,249),
('Харьков',2018,'tournament','Маф-марафон 2018',null,array['Бенджамин и Кельтас','Артикартошечка и Ума','Sunny и Mia'],'28 игр за 25 часов, главный приз 1000 грн',260),
('Харьков',2019,'tournament','Mafia Champions League 2018/2019',null,array['Шершень','Бенджамин','Добряк'],'призовой фонд 8000 грн, 106 игр за сезон',261),
('Харьков',2019,'mini','Рождественский','VIII',array['Бенджамин'],'08.01.2019, онлайн-трансляция',1079)
) as v(city, year, category, title, season, places, note, sort) where c.slug = 'mafiacl-prague';

insert into public.hall_of_fame (club_id, city, year, category, title, season, places, sort)
select c.id, 'Харьков', m.year, 'mini', m.num, m.season, array[m.name], m.sort
from public.clubs c,
(select s.season, s.year, split_part(t.item,' ',1) as num, substr(t.item, strpos(t.item,' ')+1) as name, s.base + t.ord::int as sort
 from (values
 ('IV',2014,840,'I Борщ|II Шкода|III Кертис|IV Амбал|V Амбал|VI Полицейский|VII Мими|VIII Бордо|IX Борщ|X Нулевой|XI Амахонда|XII Леди Бу|XIII Кастет|XIV Кай|XV Марта|XVI Персик|XVII Trevery|XVIII Сарказм|XIX Сарказм|XX Леди Бу|XXI МБ|XXII Black|XXIII Black|XXIV Дин|XXV Эммануэль|XXVI Бордо|XXVII Ятна|XXVIII Дин|XXIX Полицейский|XXX Пибб|XXXI Бенджамин|XXXII Латвия|XXXIII Леди Бу'),
 ('V',2015,900,'I Марта|II Бордо|III Ятна|IV КС|V Ева|VI Кай|VII Эммануэль|VIII Анархия|IX Trevery|X Кря-кря|XI Trevery|XII Кай|XIII Animorf|XIV Бордо|XV Flash|XVI Trevery|XVII Ятна|XVIII Rize|XIX Сарказм|XX Кря-кря|XXI Полицейский|XXII Гармония|XXIII Борщ|XXIV Шкода|XXV МС|XXVI Гармония|XXVII Шкода|XXVIII Полицейский|XXIX Эммануэль|XXX Lawliet|XXXI Lawliet|XXXII Гармония|XXXIII Борщ|XXXIV Анархия|XXXV Эммануэль|XXXVI Lawliet|XXXVII Сарказм|XXXVIII Flash|XXXIX Шкода|XL Setti|XLI Flash'),
 ('VI',2016,960,'I Balu|II RiT|III Борщ|IV Бордо|V Борщ|VI Сарказм|VII Бордо|VIII Эммануэль|IX Борщ|X Клайд|XI Snow|XII Ларс|XIII Гармония|XIV Оливка|XV Борщ|XVI Пиноккио|XVII Анархия|XVIII Добр|XIX Леди Бу|XX Кай|XXI Донс|XXII Борщ|XXIII Донс|XXIV Кай|XXV Sunny|XXVI Малыш|XXVII Бенджамин|XXVIII Хохольчик|XXIX Ginger|XXX Октава|XXXI Оливка|XXXII Snow|XXXIII Чикаго|XXXIV Борщ|XXXV Snow|XXXVI Lynch|XXXVII Хохольчик|XXXVIII Артикартошечка|XXXIX Бенджамин|XL Персик|XLI Trevery|XLII Ятна|XLIII Марта|XLIV Shelby|XLV YeS|XLVI Snow'),
 ('VII',2017,1020,'I Гармония'),
 ('VIII',2018,1080,'I Гармония|II Шершень|III Сталкер|IV Кукла|V Бенджамин|VI Дор|VII Дор|VIII Fake|IX Шершень|X Кельтас|XI Спектр|XII Бенджамин|XIII Спектр|XIV YeS|XV Исайя|XVI Люк|XVII Люк|XVIII Джина'),
 ('IX',2019,1140,'I Trevery|II Duff|III Cardinal|IV Flash|V Fake|VI Полицейский|VII Ice|VIII Ice|IX Марта|X Дор|XI Гармония|XII Человек|XIII Trevery|XIV Багряный|XV Бенджамин|XVI Ginger|XVII Cardinal')
 ) as s(season, year, base, list),
 lateral unnest(string_to_array(s.list,'|')) with ordinality as t(item, ord)) m
where c.slug = 'mafiacl-prague';

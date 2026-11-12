-- Зал славы: фото к записям архива (пути к файлам в /public/hall или полные URL).
alter table public.hall_of_fame add column photos text[] not null default '{}';
update public.hall_of_fame set photos = array['/hall/2012-season-1-podium.jpg','/hall/2012-season-1-rit.jpg','/hall/2012-season-1-finalists.jpg']
 where category = 'season' and year = 2012 and season = 'I' and city = 'Харьков';
update public.hall_of_fame set photos = array['/hall/2013-season-2-podium.jpg','/hall/2013-season-2-finalists.jpg']
 where category = 'season' and year = 2013 and season = 'II' and city = 'Харьков';
update public.hall_of_fame set photos = array['/hall/2013-season-3-podium.jpg','/hall/2013-season-3-latvia.jpg'], note = 'финал 21.12.2013'
 where category = 'season' and year = 2013 and season = 'III' and city = 'Харьков';
update public.hall_of_fame set photos = array['/hall/2014-season-4-persik.jpg','/hall/2014-season-4-podium.jpg','/hall/2014-season-4-finalists.jpg'], note = 'финал 27.12.2014; 205 рейтинговых игр, 33 мини-турнира'
 where category = 'season' and year = 2014 and season = 'IV' and city = 'Харьков';
update public.hall_of_fame set photos = array['/hall/2012-season-1-champion.jpg','/hall/2012-season-1-podium.jpg','/hall/2012-season-1-rit.jpg','/hall/2012-season-1-finalists.jpg']
 where category = 'season' and year = 2012 and season = 'I' and city = 'Харьков';

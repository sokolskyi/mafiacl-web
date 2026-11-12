-- Зал славы: фото к записям архива (пути к файлам в /public/hall или полные URL).
alter table public.hall_of_fame add column photos text[] not null default '{}';
update public.hall_of_fame set photos = array['/hall/2012-season-1-podium.jpg','/hall/2012-season-1-rit.jpg','/hall/2012-season-1-finalists.jpg']
 where category = 'season' and year = 2012 and season = 'I' and city = 'Харьков';
update public.hall_of_fame set photos = array['/hall/2013-season-2-podium.jpg','/hall/2013-season-2-finalists.jpg']
 where category = 'season' and year = 2013 and season = 'II' and city = 'Харьков';

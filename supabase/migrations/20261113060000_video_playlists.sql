-- Плейлисты YouTube-канала клуба (@Mafiacl) к сезонам и турнирам на сайте.
alter table public.hall_of_fame add column video_url text check (video_url ~ '^https://www\.youtube\.com/playlist\?list=[A-Za-z0-9_-]+$');
alter table public.tournaments add column video_url text check (video_url ~ '^https://www\.youtube\.com/playlist\?list=[A-Za-z0-9_-]+$');
alter table public.rating_archive add column video_url text check (video_url ~ '^https://www\.youtube\.com/playlist\?list=[A-Za-z0-9_-]+$');

update public.hall_of_fame h set video_url = 'https://www.youtube.com/playlist?list=' || v.list
from (values
  (2, 'PLtrPZrjZQNKdt9fKxK5LZG5rlahUvxVYt'),   -- MafiaCl Kharkiv II сезон Final 2013. Вольфрам
  (3, 'PLtrPZrjZQNKcrATgnWFkScoTEyCv_t2r9'),   -- III сезон Final 2013. Латвия
  (4, 'PLtrPZrjZQNKcu4ZXoS8LRWQOKhip2-we5'),   -- IV сезон Final 2014. Персик
  (5, 'PLtrPZrjZQNKfaA6ScFqRxmH8WApFw1POR'),   -- V сезон (2015). Сарказм
  (6, 'PLtrPZrjZQNKdDJUTQJ15AGWRgZHR6Oqka'),   -- VI сезон (2016). Дин
  (7, 'PLtrPZrjZQNKcYV9h_iPlVWs8z5UHp1bFt'),   -- VII сезон (2017). Flash
  (8, 'PLtrPZrjZQNKcF0p2Q04B7pMFHPVw_DMMq'),   -- VIII сезон (2018) Snow
  (10, 'PLtrPZrjZQNKeFDTh3FbC-YduLCPJa9Rnw'),  -- MafiaCl Championship 2013. RiT
  (353, 'PLtrPZrjZQNKcGR0hsEkCO1Q3qpcfGCoxu'), -- Кубок Слобожанщины 2014. Animorf
  (12, 'PLtrPZrjZQNKeMgKnHhko6n0Iq9LZyRKtR'),  -- Кубок Слобожанщины 2015 Артист
  (186, 'PLtrPZrjZQNKc5VQbYBEYcn9pVrEOooeq_'), -- MafiaCl Championship 2015. Артист
  (187, 'PLtrPZrjZQNKffNi75i9IqWZqwEEc3zLA8'), -- MafiaCl Kharkiv Cup 2015
  (13, 'PLtrPZrjZQNKeerom1XqORXnO2Yye07BM0'),  -- Кубок Слобожанщины 2016. Кай
  (14, 'PLtrPZrjZQNKfUjS0btGwIslpVi-Gm_QwU'),  -- Mafia Stars 2016. Борщ
  (188, 'PLtrPZrjZQNKenOgWGhjwML5eH_YMI5KT1'), -- MafiaCl Championship 2016 Lucky
  (189, 'PLtrPZrjZQNKdTuDA_7-qfjL2pX7HR9jDS'), -- MafiaCl Kharkiv Cup 2016
  (191, 'PLtrPZrjZQNKdDiC7YK92d2e1sulCFJ55N'), -- Маф-марафон 2016
  (15, 'PLtrPZrjZQNKcIK18I6itE_nrVK35L0s1h'),  -- Кубок Слобожанщины 2017. Сарказм
  (16, 'PLtrPZrjZQNKe8rNfjzLgalKuKn8IfCBWo'),  -- Mafia Stars 2017. RiT
  (17, 'PLtrPZrjZQNKcHDrVO2wRWfACouCmu7qlU'),  -- Mafia Champions league 2016/2017. Дин
  (18, 'PLtrPZrjZQNKeVPKpMEZJNJh_Bt_z_KU4G'),  -- MafiaCl Championship 2017. Анархия
  (19, 'PLtrPZrjZQNKcubefMuZ4p9EQ2BxC-Rcbu'),  -- MafiaCl Kharkiv Cup 2017. Борщ & Snow
  (21, 'PLtrPZrjZQNKc7I6IMwzdbbfrBpOFUFDqf'),  -- Student league Summer Challenge 2017
  (193, 'PLtrPZrjZQNKeRA-A3sE_YmquYwSu54Gi1'), -- Ukrainian Students Tournament 2017. Анархия
  (22, 'PLtrPZrjZQNKeQ9D8jhtSNuQ-wJ36RAQLQ'),  -- Кубок Слобожанщины 2018. 22
  (23, 'PLtrPZrjZQNKcU3_i_TVMy9IHhOZJrHxCX'),  -- MAFIA STARS 2018. Flash
  (24, 'PLtrPZrjZQNKctrXYiIXms-4YNRHO5QAfA'),  -- Mafia Champions league 2017/2018. Бенджамин
  (25, 'PLtrPZrjZQNKe4u8HgQCyninOQhzH-xuB5'),  -- MafiaCl Kharkiv Cup 2018
  (26, 'PLtrPZrjZQNKdh_79RQUNj1N6JwqamqVeL'),  -- Ukrainian Students Tournament 2018. Полицейский
  (174, 'PLtrPZrjZQNKcXKKqYdbGwcJoTnA0Qw0x_'), -- MafiaCl Championship 2018. Вольфрам
  (28, 'PLtrPZrjZQNKfBpTH2db1pzQDGXEL6Lex_'),  -- MAFIA STARS Ukraine 2019. Flash
  (29, 'PLtrPZrjZQNKcP8fH1yNifL0n3bcNp07wP'),  -- Ukrainian Students Tournament 2019. Абрам
  (195, 'PLtrPZrjZQNKc4QdmTpE0aOCapHInmZKDy'), -- Mafia Champions league 2018/2019. Шершень
  (30, 'PLtrPZrjZQNKf3tOLgwqFL0vH71rMPhi8_'),  -- Mafia Champions league 2019/2020. Кира
  (354, 'PLtrPZrjZQNKfe5-6h5MDDGZVqovj3Cvqn'), -- Кубок Слобожанщины 2020. Марта
  (31, 'PLtrPZrjZQNKfpWxAKb70a4el2HBO98bTT'),  -- Mafia Champions league 2020/2021. Шершень
  (32, 'PLtrPZrjZQNKcM7KsODeUrkxT2HBiSvTb8'),  -- Кубок Слобожанщины 2021. Sailos
  (33, 'PLtrPZrjZQNKew_lEDKkVCvJjJuygSX6kt'),  -- MAFIA STARS Europe 2021. Сова
  (179, 'PLtrPZrjZQNKc_ymFKhn0vpTeS6_TJboco'), -- I сезон CL Prague (2022). Рауль
  (180, 'PLtrPZrjZQNKeSmXhfBYpX-jthcK1hxGgO'), -- Euromaf 2022. walle
  (181, 'PLtrPZrjZQNKdC3pZUCPYPMkMi8HRMzHxj'), -- MafiaCl Championship 2023. Адлер
  (355, 'PLtrPZrjZQNKcPJIOcLTHcfb9lq6GQkFOb'), -- Central Cup 2023. Рауль
  (356, 'PLtrPZrjZQNKdGDp3kziUrWFEeULYFoLF9'), -- Командный чемпионат Европы 2023
  (358, 'PLtrPZrjZQNKeia0WAV86GTy2jn6iHFKl0'), -- II сезон CL Prague (2023). YeS
  (359, 'PLtrPZrjZQNKdGXhELU5rQl5tUJJg2HVCr'), -- III season CL Prague (2024). Рауль
  (363, 'PLtrPZrjZQNKeTJ1FFKvKTLtrRumEg6s-N'), -- MafiaCl Championship 2024. Deid_Ara
  (543, 'PLtrPZrjZQNKdWbv9enBuEUq3BCxaMUtnY'), -- City League
  (360, 'PLtrPZrjZQNKdBWCdzhNgdyhj_w4EIlnAs'), -- IV season CL Prague. 2025. YeS
  (366, 'PLtrPZrjZQNKdBH632Jer6h-PKvd090ct9'), -- Four Seasons: Central Cup 2025
  (367, 'PLtrPZrjZQNKefB158VuE8lqbZiKqGKS-U'), -- Czech me hard 2025. Амо
  (369, 'PLtrPZrjZQNKeXlSH7ciZZrduEzaNawvrw'), -- MafiaCl Kings 2025. DOVOD
  (373, 'PLtrPZrjZQNKfR4PZf3WmobpHORhlzFJVE'), -- MafiaCl Protocol 4 2026
  (548, 'PLtrPZrjZQNKeG5gynyAzbTueBUbi_MkTc')  -- Central Euro Cup 2026
) as v(id, list)
where h.id = v.id;

update public.tournaments t set video_url = 'https://www.youtube.com/playlist?list=' || v.list
from (values
  ('czech-me-hard-2025', 'PLtrPZrjZQNKefB158VuE8lqbZiKqGKS-U'),
  ('mafiacl-protocol-4-2026', 'PLtrPZrjZQNKfR4PZf3WmobpHORhlzFJVE'),
  ('central-euro-cup-2026', 'PLtrPZrjZQNKeG5gynyAzbTueBUbi_MkTc')
) as v(slug, list)
where t.slug = v.slug;

update public.rating_archive r set video_url = 'https://www.youtube.com/playlist?list=' || v.list
from (values
  ('sezon-i-2022', 'PLtrPZrjZQNKc_ymFKhn0vpTeS6_TJboco'),
  ('sezon-ii-2023', 'PLtrPZrjZQNKeia0WAV86GTy2jn6iHFKl0'),
  ('season-iii-2024', 'PLtrPZrjZQNKdGXhELU5rQl5tUJJg2HVCr'),
  ('season-iv-2025', 'PLtrPZrjZQNKdBWCdzhNgdyhj_w4EIlnAs'),
  ('season-v-2026', 'PLtrPZrjZQNKfv4y3aIYVg9lo-hZx78jTG')
) as v(slug, list)
where r.slug = v.slug;

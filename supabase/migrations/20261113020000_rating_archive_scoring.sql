-- Правила подсчёта рейтинга сезонов I–V (из настроек рейтингов на the-mafia.net): структурно, чтобы показывать на 4 языках.
-- win — баллы за победу по ролям (поражение 0); pu/lh/lhSheriff — [победа команды, поражение команды].
alter table public.rating_archive add column if not exists scoring jsonb;

update public.rating_archive a set scoring = '{"win": {"civ": 3, "mafia": 3, "sheriff": 3, "don": 3}, "pu": [0, 1], "lh": {"0": [0, 0], "1": [0, 0], "2": [0.5, 0.5], "3": [1, 1]}, "lhSheriff": {"0": [0, 0], "1": [0, 0], "2": [0.4, 0.4], "3": [0.8, 0.8]}, "bestPlayer": 0.7, "buttons": [0.5, 0.3], "gamesCoef": 0.3, "minShareDiv": 5.01}'::jsonb, formula = '((((aps+ps)/gc)*100)+(gc*0.3))%1'
from public.clubs c where c.id = a.club_id and c.slug = 'mafiacl-prague' and a.number = 1;
update public.rating_archive a set scoring = '{"win": {"civ": 3.3, "mafia": 3, "sheriff": 3.3, "don": 3}, "pu": [0, 1], "lh": {"0": [0, 0], "1": [0, 0], "2": [0.5, 0.5], "3": [1, 1]}, "lhSheriff": {"0": [0, 0], "1": [0, 0], "2": [0.4, 0.4], "3": [0.8, 0.8]}, "bestPlayer": 1, "buttons": [], "gamesCoef": 0.3, "minShareDiv": 5.01}'::jsonb, formula = '((((aps+ps)/gc)*100)+(gc*0.3))%1'
from public.clubs c where c.id = a.club_id and c.slug = 'mafiacl-prague' and a.number = 2;
update public.rating_archive a set scoring = '{"win": {"civ": 1, "mafia": 1, "sheriff": 1, "don": 1}, "pu": [0, 0.1], "lh": {"0": [-0.4, 0], "1": [0, 0.2], "2": [0.2, 0.5], "3": [0.4, 0.8]}, "lhSheriff": {"0": [-0.5, -0.1], "1": [-0.1, 0], "2": [0.1, 0.4], "3": [0.3, 0.7]}, "bestPlayer": 0.4, "buttons": [0.1, -0.1], "gamesCoef": 0.05, "minShareDiv": 5.01}'::jsonb, formula = '((((aps+ps)/gc)*100)+(gc*0.05))%1'
from public.clubs c where c.id = a.club_id and c.slug = 'mafiacl-prague' and a.number = 3;
update public.rating_archive a set scoring = '{"win": {"civ": 1, "mafia": 1, "sheriff": 1, "don": 1}, "pu": [0, 0.1], "lh": {"0": [-0.3, 0], "1": [0, 0.2], "2": [0.25, 0.5], "3": [0.5, 0.8]}, "lhSheriff": {"0": [-0.4, -0.1], "1": [0, 0], "2": [0.2, 0.4], "3": [0.4, 0.7]}, "bestPlayer": 0.4, "buttons": [0.1, -0.1], "gamesCoef": 0.05, "minShareDiv": 5.01}'::jsonb, formula = '((((aps+ps)/gc)*100)+(gc*0.05))%1'
from public.clubs c where c.id = a.club_id and c.slug = 'mafiacl-prague' and a.number = 4;
update public.rating_archive a set scoring = '{"win": {"civ": 1, "mafia": 1, "sheriff": 1, "don": 1}, "pu": [0, 0.1], "lh": {"0": [-0.3, 0], "1": [0, 0.2], "2": [0.25, 0.5], "3": [0.5, 0.8]}, "lhSheriff": {"0": [-0.4, -0.1], "1": [0, 0], "2": [0.2, 0.4], "3": [0.4, 0.7]}, "bestPlayer": null, "buttons": [0.1, -0.1], "gamesCoef": 0.05, "minShareDiv": 5.01}'::jsonb, formula = '((((aps+ps)/gc)*100)+(gc*0.05))%1'
from public.clubs c where c.id = a.club_id and c.slug = 'mafiacl-prague' and a.number = 5;

-- Поимённое голосование: сколько раз игрок за партию голосовал в чёрных и в красных.
alter table public.match_players
  add column votes_black smallint not null default 0 check (votes_black >= 0),
  add column votes_red smallint not null default 0 check (votes_red >= 0);

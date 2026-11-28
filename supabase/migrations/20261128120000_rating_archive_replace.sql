-- Обновление копии текущего сезона с the-mafia.net одной транзакцией (строки + сводка сезона).
-- Вызывает только сервер (сервисный ключ) из крона api/cron/mafgame.
create or replace function public.rating_archive_replace(
  p_id bigint, p_rows jsonb, p_games integer, p_civ integer, p_mafia integer, p_as_of date
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not exists (select 1 from public.rating_archive where id = p_id and is_current) then
    raise exception 'season % is not current', p_id;
  end if;
  if jsonb_array_length(p_rows) = 0 then
    raise exception 'empty table';
  end if;
  delete from public.rating_archive_rows where archive_id = p_id;
  insert into public.rating_archive_rows (archive_id, rank, nickname, points, extra, games, wins, best_player, first_killed,
    best_move3, best_move2, civ_w, civ_l, mafia_w, mafia_l, sheriff_w, sheriff_l, don_w, don_l, qualified)
  select p_id, r.rank, r.nickname, r.points, r.extra, r.games, r.wins, r.best_player, r.first_killed,
    r.best_move3, r.best_move2, r.civ_w, r.civ_l, r.mafia_w, r.mafia_l, r.sheriff_w, r.sheriff_l, r.don_w, r.don_l, r.qualified
  from jsonb_to_recordset(p_rows) as r(rank smallint, nickname text, points numeric, extra numeric, games smallint, wins smallint,
    best_player smallint, first_killed smallint, best_move3 smallint, best_move2 smallint, civ_w smallint, civ_l smallint,
    mafia_w smallint, mafia_l smallint, sheriff_w smallint, sheriff_l smallint, don_w smallint, don_l smallint, qualified boolean);
  get diagnostics n = row_count;
  update public.rating_archive set games = p_games, civ_wins = p_civ, mafia_wins = p_mafia, as_of = p_as_of where id = p_id;
  return n;
end;
$$;
revoke execute on function public.rating_archive_replace(bigint, jsonb, integer, integer, integer, date) from public, anon, authenticated;
grant execute on function public.rating_archive_replace(bigint, jsonb, integer, integer, integer, date) to service_role;

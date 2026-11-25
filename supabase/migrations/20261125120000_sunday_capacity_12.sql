-- Воскресная MafiaCL Arena: 12 игроков по очереди (6 игр, каждый играет 5) — стол на 10 и 2 места сверх стола.
update public.game_schedules set capacity = 12 where id = 2;
update public.games set capacity = 12
where schedule_id = 2 and status = 'open' and starts_at > now() and capacity = 10;

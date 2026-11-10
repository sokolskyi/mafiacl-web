-- Разовый перенос абонементов из таблицы «Абонементы 2026» (выполнен 10.11.2026, повторно не запускать).
with c as (select id from public.clubs where slug = 'mafiacl-prague'),
src (holder_name, plan, valid_from, valid_until, paid, note) as (values
  ('Антонио', 'year', date '2026-02-06', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; скидка: MafiaCl Championship 2026; бонус 50% на серии'),
  ('Панда', 'year', date '2026-02-06', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('Owner', 'year', date '2026-02-10', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('Maverick', 'year', date '2026-02-10', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; скидка: MafiaCl Championship 2026; бонус 50% на серии'),
  ('Рауль', 'year', date '2026-02-10', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('Остiн', 'year', date '2026-02-10', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('Sever', 'year', date '2026-02-10', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; скидка: MafiaCl Championship 2026; бонус 50% на серии'),
  ('Link', 'year', date '2026-02-10', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; скидка: MafiaCl Championship 2026; бонус 50% на серии'),
  ('Tops', 'year', date '2026-02-11', date '2026-12-31', 4300, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('MorningStar', 'year', date '2026-02-12', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; скидка: MafiaCl Championship 2026; бонус 50% на серии'),
  ('Калипсо', 'year', date '2026-02-18', date '2026-12-31', 8600, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('Kleo', 'quarter', date '2026-02-08', date '2026-12-31', 3150, 'Из таблицы «Абонементы 2026»; скидка: Central Euro Cup 2026 series 2; бонус 50% на серии'),
  ('Гре4а', 'quarter', date '2026-02-08', date '2026-05-08', 3150, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('Лана', 'quarter', date '2026-02-09', date '2026-05-09', 3150, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('DOVOD', 'quarter', date '2026-02-17', date '2026-05-17', 3150, 'Из таблицы «Абонементы 2026»; скидка: MCL Series 1; бонус 50% на серии'),
  ('Lady O', 'month', date '2026-02-11', date '2026-03-11', 1150, 'Из таблицы «Абонементы 2026»'),
  ('mobi', 'quarter', date '2026-03-01', date '2026-06-01', 3150, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('Kramola', 'quarter', date '2026-03-03', date '2026-06-03', 3150, 'Из таблицы «Абонементы 2026»; бонус 50% на серии'),
  ('Wapi', 'quarter', date '2026-03-01', date '2026-06-01', 0, 'Из таблицы «Абонементы 2026»'),
  ('Люсi', 'quarter', date '2026-03-03', date '2026-06-03', 3150, 'Из таблицы «Абонементы 2026»; скидка: Central Euro Cup 2026 series 11; бонус 50% на серии'),
  ('SleepyLord', 'month', date '2026-03-09', date '2026-04-09', 1150, 'Из таблицы «Абонементы 2026»'),
  ('Сергеевна', 'month', date '2026-04-08', date '2026-05-08', 1150, 'Из таблицы «Абонементы 2026»'),
  ('Lady O', 'month', date '2026-04-08', date '2026-05-08', 1150, 'Из таблицы «Абонементы 2026»'),
  ('Sometimes', 'quarter', date '2026-04-18', date '2026-07-18', 3150, 'Из таблицы «Абонементы 2026»'),
  ('Сергеевна', 'month', date '2026-05-07', date '2026-06-07', 1150, 'Из таблицы «Абонементы 2026»'),
  ('Kleo', 'quarter', date '2026-06-26', date '2026-08-26', 3150, 'Из таблицы «Абонементы 2026»; скидка: German Mafia Cup Europa Edition 2026 - Прага 3'),
  ('Dara', 'month', date '2026-06-02', date '2026-07-02', 1150, 'Из таблицы «Абонементы 2026»'),
  ('Люсi', 'month', date '2026-07-07', date '2026-08-07', 1150, 'Из таблицы «Абонементы 2026»'),
  ('DonValeron', 'quarter', date '2026-08-11', date '2026-11-11', 3150, 'Из таблицы «Абонементы 2026»'),
  ('Kleo', 'quarter', date '2026-09-01', date '2026-12-01', 3150, 'Из таблицы «Абонементы 2026»')
),
ins as (
  insert into public.memberships (club_id, holder_name, plan, valid_from, valid_until, note, created_by)
  select c.id, s.holder_name, s.plan, s.valid_from, s.valid_until, s.note, null from src s, c
  returning id, club_id, holder_name, valid_from, note
)
insert into public.payments (club_id, purpose, membership_id, amount_czk, method, note, recorded_by, created_at)
select i.club_id, 'membership', i.id, s.paid, 'other', 'Перенесено из таблицы абонементов', null, s.valid_from::timestamptz
from ins i join src s on s.holder_name = i.holder_name and s.valid_from = i.valid_from and s.note = i.note
where s.paid > 0;

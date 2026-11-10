-- Отметка «пришёл» для ведущего; игрок сам её поставить не может (колонка не в его политике UPDATE: он может только отменить).
alter table public.game_signups add column checked_in_at timestamptz;
grant update (checked_in_at) on public.game_signups to authenticated;

-- Игрок обновляет только свою запись и только на «cancelled» — WITH CHECK уже это требует,
-- но отметку прихода он мог бы поставить вместе с отменой. Запрещаем явно.
drop policy "players cancel own signup" on public.game_signups;
create policy "players cancel own signup" on public.game_signups for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()) and status = 'cancelled' and checked_in_at is null);

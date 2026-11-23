-- Respect: какие начисления игрок уже видел (для праздничного уведомления в кабинете).
alter table public.profile_private add column if not exists respect_seen_id bigint;

-- Уже существующие начисления считаем просмотренными, чтобы после выкладки
-- никому не выпала вся история разом.
update public.profile_private pp
   set respect_seen_id = l.max_id
  from (select profile_id, max(id) as max_id from public.respect_ledger group by profile_id) l
 where l.profile_id = pp.profile_id
   and pp.respect_seen_id is null;

-- Отметить просмотренным: только своё, и только вперёд (меньшим id не откатить).
create or replace function public.respect_mark_seen(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_max bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select max(id) into v_max from public.respect_ledger where profile_id = v_uid;
  if v_max is null then
    return;
  end if;
  insert into public.profile_private (profile_id, respect_seen_id)
  values (v_uid, least(p_id, v_max))
  on conflict (profile_id) do update
    set respect_seen_id = greatest(coalesce(public.profile_private.respect_seen_id, 0), excluded.respect_seen_id);
end;
$$;

revoke all on function public.respect_mark_seen(bigint) from public, anon;
grant execute on function public.respect_mark_seen(bigint) to authenticated;

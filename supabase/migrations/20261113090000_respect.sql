-- Программа лояльности Respect: 1 Respect = 2 Kč.
-- Начисления: клубная партия 1, турнирная 2, финал сезона 3; бонусы; одноразовые коды физических монет.
-- Траты: вечер (цена / 2), часть заказа в магазине (мерч до 50 %, абонемент до 30 %).

create table public.respect_ledger (
  id bigserial primary key,
  club_id bigint not null references public.clubs (id),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0 and amount between -100000 and 100000),
  reason text not null check (reason in (
    'game', 'first_game', 'milestone', 'evening_win', 'bonus', 'referral', 'birthday', 'blog', 'review',
    'code', 'spend_game', 'spend_shop', 'refund', 'adjust'
  )),
  ref text check (char_length(ref) <= 80),
  note text check (char_length(note) <= 200),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index respect_ledger_profile_ref on public.respect_ledger (profile_id, ref) where ref is not null;
create index respect_ledger_profile_time on public.respect_ledger (profile_id, created_at desc);
create index respect_ledger_ref on public.respect_ledger (ref) where ref is not null;
comment on table public.respect_ledger is 'Движения Respect (программа лояльности). Баланс = сумма amount. Пишут только функции respect_*';
alter table public.respect_ledger enable row level security;
create policy "respect_ledger own read" on public.respect_ledger for select to authenticated
  using ((select auth.uid()) = profile_id);
grant select on public.respect_ledger to authenticated;

create table public.respect_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6,12}$'),
  club_id bigint not null references public.clubs (id),
  amount integer not null check (amount between 1 and 10000),
  batch text not null check (char_length(batch) between 1 and 60),
  note text check (char_length(note) <= 200),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  redeemed_by uuid references public.profiles (id) on delete set null,
  redeemed_at timestamptz
);
create index respect_codes_batch on public.respect_codes (batch);
comment on table public.respect_codes is 'Одноразовые коды физических монет Respect (QR на монете)';
alter table public.respect_codes enable row level security;
revoke all on public.respect_codes from anon, authenticated;

alter table public.shop_orders
  add column respect_points integer not null default 0 check (respect_points >= 0),
  add column respect_czk numeric not null default 0 check (respect_czk >= 0);

-- ---------------------------------------------------------------------------
create or replace function private.respect_balance(p_profile uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount), 0)::integer from public.respect_ledger where profile_id = p_profile
$$;

create or replace function private.respect_add(
  p_club bigint, p_profile uuid, p_amount integer, p_reason text, p_ref text, p_note text, p_by uuid
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  insert into public.respect_ledger (club_id, profile_id, amount, reason, ref, note, created_by)
    values (p_club, p_profile, p_amount, p_reason, p_ref, p_note, p_by)
    on conflict (profile_id, ref) where ref is not null do nothing
    returning id into v_id;
  return v_id is not null;
end;
$$;

create or replace function public.respect_balance(p_profile uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select private.respect_balance(p_profile)
$$;

/** Начисление за сыгранную партию + бонусы за первую игру, юбилейные партии и победу в мини-турнире. Повторный вызов безопасен. */
create or replace function public.respect_award_match(p_match bigint) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  m record;
  r record;
  v_mult integer;
  v_games integer;
  v_n integer := 0;
  ms integer[] := array[50, 100, 250, 500];
  mb integer[] := array[25, 50, 100, 200];
  i integer;
begin
  select mt.id, mt.club_id, mt.game_id, mt.status, g.kind, g.final_rating_id
    into m
    from public.matches mt left join public.games g on g.id = mt.game_id
    where mt.id = p_match;
  if not found or m.status <> 'finished' then return 0; end if;
  v_mult := case
    when m.final_rating_id is not null then 3
    when m.kind = 'tournament' then 2
    when m.kind in ('rating', 'fun') or m.kind is null then 1
    else 0 end;
  if v_mult = 0 then return 0; end if;

  for r in
    select distinct mp.profile_id
    from public.match_players mp join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match and p.verification = 'approved'
  loop
    if private.respect_add(m.club_id, r.profile_id, v_mult, 'game', 'match:' || p_match, null, null) then v_n := v_n + 1; end if;
    perform private.respect_add(m.club_id, r.profile_id, 20, 'first_game', 'first_game', null, null);
    select count(*) into v_games from public.respect_ledger where profile_id = r.profile_id and reason = 'game';
    for i in 1 .. array_length(ms, 1) loop
      if v_games >= ms[i] then
        perform private.respect_add(m.club_id, r.profile_id, mb[i], 'milestone', 'milestone:' || ms[i], ms[i] || ' партий', null);
      end if;
    end loop;
  end loop;

  -- Победа в мини-турнире: лидер вечера на текущий момент (пересчитывается после каждой партии).
  if m.kind = 'rating' and m.final_rating_id is null and m.game_id is not null then
    delete from public.respect_ledger where ref = 'evening_win:' || m.game_id;
    insert into public.respect_ledger (club_id, profile_id, amount, reason, ref)
      select m.club_id, st.profile_id, 5, 'evening_win', 'evening_win:' || m.game_id
      from public.evening_standings(m.game_id) st join public.profiles p on p.id = st.profile_id
      where st.place = 1 and p.verification = 'approved'
      on conflict (profile_id, ref) where ref is not null do nothing;
  end if;
  return v_n;
end;
$$;

/** Активировать код физической монеты. */
create or replace function public.respect_redeem(p_profile uuid, p_code text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  c record;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if not exists (select 1 from public.profiles where id = p_profile and verification = 'approved') then
    raise exception 'not_verified';
  end if;
  select * into c from public.respect_codes where code = v_code for update;
  if not found then raise exception 'code_not_found'; end if;
  if c.redeemed_by is not null then raise exception 'code_used'; end if;
  update public.respect_codes set redeemed_by = p_profile, redeemed_at = now() where code = v_code;
  perform private.respect_add(c.club_id, p_profile, c.amount, 'code', 'code:' || v_code, c.note, null);
  return c.amount;
end;
$$;

/** Выпустить пачку кодов: 8 символов без похожих (0/O, 1/I). */
create or replace function public.respect_create_codes(
  p_club bigint, p_count integer, p_amount integer, p_batch text, p_note text, p_by uuid
) returns setof text
language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  b bytea;
  k integer;
  made integer := 0;
begin
  if p_count < 1 or p_count > 300 then raise exception 'invalid'; end if;
  while made < p_count loop
    b := uuid_send(gen_random_uuid());
    v_code := '';
    for k in 0 .. 7 loop
      v_code := v_code || substr(alphabet, (get_byte(b, k) % 32) + 1, 1);
    end loop;
    begin
      insert into public.respect_codes (code, club_id, amount, batch, note, created_by)
        values (v_code, p_club, p_amount, p_batch, p_note, p_by);
      made := made + 1;
      return next v_code;
    exception when unique_violation then
      -- редкий повтор — пробуем ещё раз
    end;
  end loop;
end;
$$;

/** Ручное начисление или списание (бонус, приведи друга, день рождения, статья, исправление). */
create or replace function public.respect_adjust(
  p_club bigint, p_profile uuid, p_amount integer, p_reason text, p_note text, p_by uuid
) returns integer
language plpgsql security definer set search_path = '' as $$
begin
  if p_reason not in ('bonus', 'referral', 'birthday', 'blog', 'review', 'evening_win', 'adjust') then raise exception 'invalid'; end if;
  perform pg_advisory_xact_lock(hashtext('respect:' || p_profile));
  if p_amount < 0 and private.respect_balance(p_profile) < -p_amount then raise exception 'insufficient'; end if;
  insert into public.respect_ledger (club_id, profile_id, amount, reason, note, created_by)
    values (p_club, p_profile, p_amount, p_reason, nullif(trim(p_note), ''), p_by);
  return private.respect_balance(p_profile);
end;
$$;

/** Оплатить вечер за Respect: цена вечера / 2. Создаёт оплату (method other, provider_ref respect). */
create or replace function public.respect_pay_game(p_signup bigint, p_by uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  v_points integer;
  v_pay bigint;
begin
  select gs.id, gs.profile_id, gs.status, g.club_id, g.price_czk
    into s
    from public.game_signups gs join public.games g on g.id = gs.game_id
    where gs.id = p_signup;
  if not found or s.profile_id is null or s.status <> 'confirmed' then raise exception 'invalid'; end if;
  if exists (select 1 from public.payments where signup_id = p_signup and status in ('paid', 'pending')) then raise exception 'already_paid'; end if;
  v_points := ceil(coalesce(s.price_czk, 0) / 2.0)::integer;
  if v_points <= 0 then raise exception 'free'; end if;
  perform pg_advisory_xact_lock(hashtext('respect:' || s.profile_id));
  if private.respect_balance(s.profile_id) < v_points then raise exception 'insufficient'; end if;
  insert into public.payments (club_id, profile_id, purpose, signup_id, amount_czk, method, status, provider_ref, note, recorded_by)
    values (s.club_id, s.profile_id, 'game', p_signup, coalesce(s.price_czk, 0), 'other', 'paid', 'respect', 'Respect', p_by)
    returning id into v_pay;
  insert into public.respect_ledger (club_id, profile_id, amount, reason, ref, created_by)
    values (s.club_id, s.profile_id, -v_points, 'spend_game', 'payment:' || v_pay, p_by);
  return v_points;
end;
$$;

/** Оплатить часть заказа Respect: мерч до 50 %, абонемент до 30 % цены. Один раз на заказ. */
create or replace function public.shop_apply_respect(p_order bigint, p_profile uuid, p_points integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  o record;
  v_cap numeric;
  v_points integer;
begin
  select * into o from public.shop_orders where id = p_order and profile_id = p_profile for update;
  if not found or o.status <> 'pending' then raise exception 'invalid'; end if;
  if o.respect_points > 0 then raise exception 'already'; end if;
  select coalesce(sum(i.price_czk * i.qty * case when p.kind = 'membership' then 0.3 else 0.5 end), 0)
    into v_cap
    from public.shop_order_items i join public.shop_products p on p.id = i.product_id
    where i.order_id = p_order;
  perform pg_advisory_xact_lock(hashtext('respect:' || p_profile));
  v_points := least(greatest(coalesce(p_points, 0), 0), floor(v_cap / 2)::integer, private.respect_balance(p_profile));
  if v_points <= 0 then raise exception 'nothing'; end if;
  update public.shop_orders
    set respect_points = v_points, respect_czk = v_points * 2, total_czk = greatest(total_czk - v_points * 2, 0)
    where id = p_order;
  insert into public.respect_ledger (club_id, profile_id, amount, reason, ref)
    values (o.club_id, p_profile, -v_points, 'spend_shop', 'order:' || p_order);
  return v_points;
end;
$$;

-- Возвраты: отмена заказа и снятая оплата вечера за Respect.
create or replace function private.respect_order_refund() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and old.respect_points > 0 then
    perform private.respect_add(old.club_id, old.profile_id, old.respect_points, 'refund', 'refund:order:' || old.id, null, null);
  end if;
  return null;
end;
$$;
create trigger shop_order_respect_refund after update of status on public.shop_orders
  for each row execute function private.respect_order_refund();

create or replace function private.respect_payment_refund() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_spent integer;
begin
  if old.provider_ref = 'respect' and old.profile_id is not null then
    select -amount into v_spent from public.respect_ledger where profile_id = old.profile_id and ref = 'payment:' || old.id;
    if v_spent > 0 then
      perform private.respect_add(old.club_id, old.profile_id, v_spent, 'refund', 'refund:payment:' || old.id, null, null);
    end if;
  end if;
  return null;
end;
$$;
create trigger payments_respect_refund after delete on public.payments
  for each row execute function private.respect_payment_refund();

revoke all on function public.respect_balance(uuid), public.respect_award_match(bigint), public.respect_redeem(uuid, text),
  public.respect_create_codes(bigint, integer, integer, text, text, uuid), public.respect_adjust(bigint, uuid, integer, text, text, uuid),
  public.respect_pay_game(bigint, uuid), public.shop_apply_respect(bigint, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.respect_balance(uuid), public.respect_award_match(bigint), public.respect_redeem(uuid, text),
  public.respect_create_codes(bigint, integer, integer, text, text, uuid), public.respect_adjust(bigint, uuid, integer, text, text, uuid),
  public.respect_pay_game(bigint, uuid), public.shop_apply_respect(bigint, uuid, integer)
  to service_role;
revoke all on function private.respect_balance(uuid), private.respect_add(bigint, uuid, integer, text, text, text, uuid) from public, anon, authenticated;

-- Дополнение (применено через MCP: respect_expire_and_fixups): причина 'expire', private.respect_expire()
-- с ежедневным pg_cron 'respect-expire' (сгорание через 12 месяцев без партий) и снятие начисления
-- за партию у игрока, которого убрали из бланка при исправлении (в respect_award_match).
-- И public.respect_outstanding(bigint[]) — сумма Respect на руках у игроков клуба (только service_role).
-- Дополнение (MCP: birthday_and_respect_rules): profile_private.birthday (+ заявка на смену через админа),
-- birthday_set / birthday_decide / birthday_requests / respect_birthday_check (+10 при первом входе после ДР),
-- статья — раз в год (ref blog:YYYY), лучший ход «три чёрных» +1, серии вечеров одного расписания: 4 подряд +1, 10 подряд +3.
-- Дополнение (MCP: blog_posts_and_club_streaks): таблица blog_posts (статьи игроков, модерация админом),
-- триггер начисляет +15 Respect за первую одобренную статью в году (ref blog:YYYY);
-- серии считаются по всем клубным вечерам подряд (rating/fun/tournament), а не по одному расписанию.
-- Дополнение (MCP: profile_links_city_key_blog_images): profiles.links (профили на markery/ФИИМ/Mafgame/Emotion Games/iMafia),
-- profiles.city хранит ключ города из списка сайта, blog_posts.images (до 4) и публичное хранилище 'blog'.

-- Через MCP применена миграция nickname_rules_and_membership_respect:
--   ник меняется сам раз в год (nickname_change), чаще — заявкой владельцу (nickname_requests / nickname_decide),
--   старый ник становится старым ником игрока (player_aliases);
--   Respect за оплаченный абонемент: месяц +10, 3 месяца +30, год +100, особый срок — 10 за 30 дней (ref membership:<id>).
-- Через MCP применены миграции shop_price_schedule и shop_set_price_schedule:
--   shop_price_schedule (цены по датам покупки), shop_products.valid_until (до какого дня действует годовой),
--   shop_order_items.membership_until; shop_create_order берёт цену на сегодня (private.shop_price_on),
--   годовой 2027: до 15.02 — 9900, 16.02–15.03 — 10900, 16.03–30.04 — 9900, май — 9000, июнь–июль — 7500,
--   август–сентябрь — 5500, с октября не продаётся; действует до 31.12.2027.

-- Журнал оплат: за игру, абонемент, позже — магазин.
-- Наличные / карта / перевод отмечает сотрудник клуба; GoPay пишет только сервер (service_role)
-- по подтверждению от платёжного шлюза.

create table public.payments (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete restrict,
  profile_id uuid references public.profiles (id) on delete set null,   -- null — гость без аккаунта
  purpose text not null check (purpose in ('game', 'membership', 'shop')),
  signup_id bigint references public.game_signups (id) on delete set null,
  membership_id bigint references public.memberships (id) on delete set null,
  amount_czk numeric(10, 2) not null check (amount_czk >= 0),
  method text not null check (method in ('cash', 'card', 'transfer', 'gopay')),
  status text not null default 'paid' check (status in ('pending', 'paid', 'refunded', 'failed')),
  provider_ref text check (char_length(provider_ref) <= 100),          -- id платежа в GoPay
  note text check (char_length(note) <= 200),
  recorded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint payments_target check (
    (purpose = 'game' and signup_id is not null)
    or (purpose = 'membership' and membership_id is not null)
    or purpose = 'shop'
  )
);
-- Одна действующая оплата на запись и на абонемент.
create unique index payments_signup_paid_key on public.payments (signup_id) where status in ('pending', 'paid') and signup_id is not null;
create unique index payments_membership_paid_key on public.payments (membership_id) where status in ('pending', 'paid') and membership_id is not null;
create unique index payments_provider_ref_key on public.payments (method, provider_ref) where provider_ref is not null;
create index payments_club_created_idx on public.payments (club_id, created_at desc);
create index payments_profile_id_idx on public.payments (profile_id);
create index payments_recorded_by_idx on public.payments (recorded_by);
alter table public.payments enable row level security;

create policy "players see own payments" on public.payments for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "staff see club payments" on public.payments for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin', 'host'])));

-- Отметка оплаты вручную. За игру — любой сотрудник; за абонемент — владелец/админ.
-- Плательщик должен совпадать с записью/абонементом, а сама запись — относиться к этому клубу.
create policy "staff record manual payments" on public.payments for insert to authenticated
  with check (
    method in ('cash', 'card', 'transfer')
    and recorded_by = (select auth.uid())
    and (
      (purpose = 'game'
        and (select private.has_club_role(club_id, array['owner', 'admin', 'host']))
        and exists (
          select 1 from public.game_signups s join public.games g on g.id = s.game_id
          where s.id = signup_id and g.club_id = payments.club_id
            and s.profile_id is not distinct from payments.profile_id
        ))
      or (purpose = 'membership'
        and (select private.has_club_role(club_id, array['owner', 'admin']))
        and exists (
          select 1 from public.memberships m
          where m.id = membership_id and m.club_id = payments.club_id and m.profile_id = payments.profile_id
        ))
    )
  );
-- Ошибочную ручную отметку можно снять: владелец/админ — любую, ведущий — свою.
create policy "staff undo manual payments" on public.payments for delete to authenticated
  using (
    method in ('cash', 'card', 'transfer')
    and (
      (select private.has_club_role(club_id, array['owner', 'admin']))
      or (recorded_by = (select auth.uid()) and (select private.has_club_role(club_id, array['host'])))
    )
  );

grant select on public.payments to authenticated;
grant insert (club_id, profile_id, purpose, signup_id, membership_id, amount_czk, method, note),
      delete on public.payments to authenticated;
grant all on public.payments to service_role;

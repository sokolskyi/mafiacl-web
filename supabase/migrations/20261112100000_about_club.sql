-- Раздел «О клубе»: роли в структуре клуба у людей из карточек ведущих и акции клуба.

-- 1) Структура клуба: кто основатель, кто администратор, кто ведёт игры.
--    Это публичная подпись на сайте, а не права доступа (права — в club_staff).
alter table public.hosts
  add column team_roles text[] not null default '{host}'
  check (team_roles <@ array['founder', 'admin', 'host']::text[] and cardinality(team_roles) between 1 and 3);

grant select (team_roles) on public.hosts to anon, authenticated;
grant insert (team_roles), update (team_roles) on public.hosts to authenticated;

update public.hosts h set team_roles = '{founder,host}'
from public.clubs c
where c.id = h.club_id and c.slug = 'mafiacl-prague' and h.nickname = 'YeS';

-- 2) Акции клуба: ведёт владелец/админ из админки.
create table public.promotions (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  title jsonb not null check (jsonb_typeof(title) = 'object' and title <> '{}'::jsonb),
  body jsonb check (body is null or jsonb_typeof(body) = 'object'),
  valid_until date,
  active boolean not null default true,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);
create index promotions_club_idx on public.promotions (club_id, sort);
alter table public.promotions enable row level security;

create policy "active promotions are public" on public.promotions for select to anon, authenticated using (active);
create policy "admins see promotions" on public.promotions for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins add promotions" on public.promotions for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins edit promotions" on public.promotions for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins remove promotions" on public.promotions for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select (id, club_id, title, body, valid_until, active, sort) on public.promotions to anon, authenticated;
grant insert (club_id, title, body, valid_until, active, sort),
      update (title, body, valid_until, active, sort), delete on public.promotions to authenticated;
grant all on public.promotions to service_role;

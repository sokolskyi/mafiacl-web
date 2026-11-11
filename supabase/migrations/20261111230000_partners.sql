-- Партнёры клуба: страница «Партнёры», ведёт владелец/админ из админки.
create table public.partners (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  url text check (url is null or url ~ '^https://[^\s]+$'),
  logo_url text check (logo_url is null or private.is_image_ref(logo_url)),
  description jsonb check (description is null or jsonb_typeof(description) = 'object'),
  active boolean not null default true,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);
create index partners_club_idx on public.partners (club_id, sort);
alter table public.partners enable row level security;

create policy "active partners are public" on public.partners for select to anon, authenticated using (active);
create policy "admins see partners" on public.partners for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins add partners" on public.partners for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins edit partners" on public.partners for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins remove partners" on public.partners for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select (id, club_id, name, url, logo_url, description, active, sort) on public.partners to anon, authenticated;
grant insert (club_id, name, url, logo_url, description, active, sort),
      update (name, url, logo_url, description, active, sort), delete on public.partners to authenticated;
grant all on public.partners to service_role;

insert into public.partners (club_id, name, url, logo_url, description, sort)
select c.id, 'POP PAUSE', 'https://www.pop-pause.cz/',
  'https://cdn.myshoptet.com/usr/www.pop-pause.cz/user/logos/poppause-v3-w1000.png',
  '{"cs":"Prémiový ručně dělaný popcorn v centru Prahy: přes 30 příchutí, dárkové plechovky a poukazy, kavárna v Panské 12.","ru":"Премиальный попкорн ручной работы в центре Праги: больше 30 вкусов, подарочные баночки и сертификаты, кафе на Панской, 12.","uk":"Преміальний попкорн ручної роботи в центрі Праги: понад 30 смаків, подарункові баночки й сертифікати, кафе на Панській, 12.","en":"Premium handmade popcorn in central Prague: 30+ flavours, gift tins and vouchers, café at Panská 12."}',
  10
from public.clubs c where c.slug = 'mafiacl-prague';

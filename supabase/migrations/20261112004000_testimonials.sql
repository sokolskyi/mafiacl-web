-- Отзывы о корпоративах: автор, фото, компания (если есть), повод, текст. Ведёт владелец/админ.
create table public.testimonials (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs (id) on delete cascade,
  kind text not null default 'corporate' check (kind in ('corporate')),
  author text not null check (char_length(author) between 1 and 80),
  photo_url text check (photo_url is null or private.is_image_ref(photo_url)),
  company text check (char_length(company) <= 120),
  event_type text check (event_type in ('teambuilding', 'party', 'birthday', 'office', 'club', 'other')),
  event_date date,
  body text not null check (char_length(body) between 1 and 1500),
  active boolean not null default true,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);
create index testimonials_club_idx on public.testimonials (club_id, kind, sort);
alter table public.testimonials enable row level security;

create policy "active testimonials are public" on public.testimonials for select to anon, authenticated using (active);
create policy "admins see testimonials" on public.testimonials for select to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins add testimonials" on public.testimonials for insert to authenticated
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins edit testimonials" on public.testimonials for update to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])))
  with check ((select private.has_club_role(club_id, array['owner', 'admin'])));
create policy "admins remove testimonials" on public.testimonials for delete to authenticated
  using ((select private.has_club_role(club_id, array['owner', 'admin'])));

grant select (id, club_id, kind, author, photo_url, company, event_type, event_date, body, active, sort) on public.testimonials to anon, authenticated;
grant insert (club_id, kind, author, photo_url, company, event_type, event_date, body, active, sort),
      update (author, photo_url, company, event_type, event_date, body, active, sort), delete on public.testimonials to authenticated;
grant all on public.testimonials to service_role;

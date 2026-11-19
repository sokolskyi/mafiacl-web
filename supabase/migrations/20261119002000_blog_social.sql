-- Статьи блога: просмотры, реакции и комментарии. Статья — по адресу (post-12, season-review-2026-11).
-- Пишет только сервер сайта (ключ service_role); посетитель — id аккаунта или случайный id из cookie.

create table public.blog_views (
  slug text not null check (slug ~ '^(post-[0-9]{1,12}|season-review-[0-9]{4}-[0-9]{2})$'),
  visitor text not null check (char_length(visitor) between 8 and 64),
  day date not null default (now() at time zone 'Europe/Prague')::date,
  primary key (slug, visitor, day)
);

create table public.blog_reactions (
  slug text not null check (slug ~ '^(post-[0-9]{1,12}|season-review-[0-9]{4}-[0-9]{2})$'),
  visitor text not null check (char_length(visitor) between 8 and 64),
  kind text not null check (kind in ('fire', 'target', 'wow', 'doubt', 'lol')),
  created_at timestamptz not null default now(),
  primary key (slug, visitor, kind)
);

create table public.blog_comments (
  id bigint generated always as identity primary key,
  slug text not null check (slug ~ '^(post-[0-9]{1,12}|season-review-[0-9]{4}-[0-9]{2})$'),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index blog_comments_slug on public.blog_comments (slug, created_at);
create index blog_comments_profile on public.blog_comments (profile_id, created_at desc);

-- Посетители и их реакции не публичны; комментарии читаются всеми.
alter table public.blog_views enable row level security;
alter table public.blog_reactions enable row level security;
alter table public.blog_comments enable row level security;
create policy "blog comments are public" on public.blog_comments for select to anon, authenticated using (true);
grant select on public.blog_comments to anon, authenticated;

-- Счётчики по статьям: просмотры (уникальные за день), реакции по видам, комментарии.
create or replace function public.blog_stats(p_slugs text[])
returns table (slug text, views integer, reactions jsonb, comments integer)
language sql stable security definer set search_path = '' as $$
  select s.slug,
         (select count(*)::integer from public.blog_views v where v.slug = s.slug),
         coalesce((select jsonb_object_agg(r.kind, r.n) from
                    (select kind, count(*)::integer n from public.blog_reactions where blog_reactions.slug = s.slug group by kind) r), '{}'::jsonb),
         (select count(*)::integer from public.blog_comments c where c.slug = s.slug)
  from unnest(p_slugs) as s(slug)
  where cardinality(p_slugs) <= 200;
$$;
revoke execute on function public.blog_stats(text[]) from public;
grant execute on function public.blog_stats(text[]) to anon, authenticated, service_role;

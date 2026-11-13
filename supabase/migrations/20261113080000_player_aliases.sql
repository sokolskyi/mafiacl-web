-- Старые/другие ники игроков (применено через MCP: player_aliases, profile_markery_id).
alter table public.profiles add column if not exists markery_id integer;
create table if not exists public.player_aliases (
  alias text primary key check (length(alias) between 1 and 64),
  canonical text not null check (length(canonical) between 1 and 64),
  created_at timestamptz not null default now(),
  constraint player_aliases_not_self check (lower(alias) <> lower(canonical))
);
create unique index if not exists player_aliases_alias_lower on public.player_aliases (lower(alias));
alter table public.player_aliases enable row level security;

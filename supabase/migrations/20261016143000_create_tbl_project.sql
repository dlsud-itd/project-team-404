-- Minimal projects table for Sprint 1 (so sign-up can create each user's Inbox).
-- Sprint 2 adds the remaining columns (description, color, is_favorite,
-- is_archived, sort_order) with `alter table ... add column`, so this file
-- never needs to be rewritten.
create table public.tbl_project (
  project_id integer generated always as identity primary key,
  user_id    uuid not null references public.tbl_user (user_id) on delete cascade,
  name       varchar(150) not null,
  is_inbox   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Every project lookup is scoped by user.
create index tbl_project_user_id_idx on public.tbl_project (user_id);

-- At most one active Inbox per user.
create unique index tbl_project_one_inbox_key
  on public.tbl_project (user_id)
  where is_inbox and deleted_at is null;

-- RLS on, no policies: the public Data API cannot read or write this table.
-- Only the Express server (service role key, which bypasses RLS) touches it.
alter table public.tbl_project enable row level security;

revoke all on public.tbl_project from anon, authenticated;

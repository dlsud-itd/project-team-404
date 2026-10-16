create table public.tbl_user (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username varchar(50) not null unique,
  timezone varchar(64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

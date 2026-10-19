alter table public.tbl_user
  add column last_login_at timestamptz;

create table public.auth_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tbl_user (user_id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index auth_session_user_id_idx on public.auth_session (user_id);
alter table public.auth_session enable row level security;
revoke all on public.auth_session from anon, authenticated;

create table public.password_reset_token (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tbl_user (user_id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index password_reset_token_user_id_idx
  on public.password_reset_token (user_id);
alter table public.password_reset_token enable row level security;
revoke all on public.password_reset_token from anon, authenticated;

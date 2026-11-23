alter table public.tbl_user_setting
  add column if not exists theme jsonb not null default '{}'::jsonb;

alter table public.tbl_user enable row level security;

revoke all on public.tbl_user from anon, authenticated;

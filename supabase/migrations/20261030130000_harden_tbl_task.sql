alter table public.tbl_task
  alter column task_id type integer;

alter sequence public.tbl_task_task_id_seq as integer;

alter table public.tbl_task
  alter column title type varchar(200);

alter table public.tbl_task enable row level security;

revoke all on table public.tbl_task from public, anon, authenticated;
revoke all on sequence public.tbl_task_task_id_seq from public, anon, authenticated;
revoke all on type public.task_priority from public, anon, authenticated;

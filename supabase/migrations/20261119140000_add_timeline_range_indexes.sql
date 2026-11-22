create index if not exists tbl_task_user_scheduled_date_active_idx
  on public.tbl_task (user_id, scheduled_date)
  where deleted_at is null;

create index if not exists tbl_task_user_deadline_active_idx
  on public.tbl_task (user_id, deadline)
  where deleted_at is null;

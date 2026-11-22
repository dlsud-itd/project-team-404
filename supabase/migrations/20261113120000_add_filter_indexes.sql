create index if not exists tbl_task_user_project_priority_active_idx
  on public.tbl_task (user_id, project_id, priority_id)
  where deleted_at is null;

create index if not exists tbl_task_user_due_date_active_idx
  on public.tbl_task (user_id, due_date)
  where deleted_at is null;

create index if not exists tbl_task_label_label_task_idx
  on public.tbl_task_label (label_id, task_id);

create index if not exists tbl_project_user_favorite_archived_idx
  on public.tbl_project (user_id, is_favorite, is_archived);

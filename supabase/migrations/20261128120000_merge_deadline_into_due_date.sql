-- A task now has only a start date (scheduled_date) and an end date (due_date).
-- Each deadline is folded into the end date, as the day it falls on in the owner's timezone,
-- keeping whichever of the two is later. Then the deadline column goes.
-- Safe to run twice: the second run finds no deadline column and does nothing.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tbl_task' and column_name = 'deadline'
  ) then
    update public.tbl_task as task
    set due_date = greatest(
      task.due_date,
      (task.deadline at time zone coalesce(owner.timezone, 'UTC'))::date
    )
    from public.tbl_user as owner
    where owner.user_id = task.user_id
      and task.deadline is not null;

    drop index if exists public.tbl_task_user_deadline_active_idx;
    alter table public.tbl_task drop column deadline;
  end if;
end $$;

-- The end date now drives overdue and timeline queries.
create index if not exists tbl_task_user_due_date_active_idx
  on public.tbl_task (user_id, due_date)
  where deleted_at is null;

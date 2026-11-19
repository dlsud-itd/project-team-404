alter table public.tbl_task
  add column position integer not null default 0;

with ranked_tasks as (
  select
    task_id,
    row_number() over (
      partition by user_id, project_id
      order by created_at, task_id
    ) as position
  from public.tbl_task
)
update public.tbl_task as task
set position = ranked_tasks.position
from ranked_tasks
where task.task_id = ranked_tasks.task_id;

create index if not exists tbl_task_user_project_position_idx
  on public.tbl_task (user_id, project_id, position)
  where deleted_at is null;

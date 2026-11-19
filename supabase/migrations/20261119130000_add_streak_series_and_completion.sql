alter table public.tbl_task
  add column if not exists recurrence_series_id uuid;

create table if not exists public.tbl_task_completion (
  completion_id bigint generated always as identity primary key,
  task_id integer not null references public.tbl_task(task_id) on delete cascade,
  user_id uuid not null references public.tbl_user(user_id) on delete cascade,
  series_id uuid,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  constraint tbl_task_completion_task_date_key unique (task_id, completed_on)
);

update public.tbl_task
set recurrence_series_id = gen_random_uuid()
where recurrence_series_id is null
  and recurrence is not null
  and recurrence <> 'none';

insert into public.tbl_task_completion (
  task_id,
  user_id,
  series_id,
  completed_on,
  completed_at
)
select
  task.task_id,
  task.user_id,
  task.recurrence_series_id,
  coalesce(task.done_at, task.updated_at)::date,
  coalesce(task.done_at, task.updated_at)
from public.tbl_task as task
where task.is_done
  and task.done_at is not null
  and task.deleted_at is null
  and task.recurrence_series_id is not null
on conflict (task_id, completed_on) do update
set
  series_id = excluded.series_id,
  completed_at = excluded.completed_at;

create index tbl_task_completion_series_idx
  on public.tbl_task_completion (user_id, series_id, completed_on desc);

alter table public.tbl_task_completion enable row level security;

revoke all on table public.tbl_task_completion from public, anon, authenticated;
revoke all on sequence public.tbl_task_completion_completion_id_seq from public, anon, authenticated;

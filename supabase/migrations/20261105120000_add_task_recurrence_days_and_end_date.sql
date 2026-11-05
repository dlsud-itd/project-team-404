-- Weekly repeats can name the weekdays they fall on (0 = Sunday … 6 = Saturday),
-- and any repeat can stop after an end date.
alter table public.tbl_task
  add column if not exists recurrence_days smallint[] not null default '{}',
  add column if not exists recurrence_end_date date;

alter table public.tbl_task
  drop constraint if exists tbl_task_recurrence_days_check;

alter table public.tbl_task
  add constraint tbl_task_recurrence_days_check
  check (recurrence_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]);

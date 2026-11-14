select public.create_default_priorities(user_id)
from public.tbl_user
where email in ('james@example.com', 'harvey@example.com');

insert into public.tbl_priority_level (user_id, name, color, sort_order, is_default)
select
  user_profile.user_id,
  'Urgent',
  '#B91C1C',
  4,
  false
from public.tbl_user as user_profile
where user_profile.email = 'james@example.com'
on conflict (user_id, lower(name)) where deleted_at is null do update
set
  color = excluded.color,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default,
  updated_at = now();

insert into public.tbl_priority_level (user_id, name, color, sort_order, is_default)
select
  user_profile.user_id,
  'Someday',
  '#94A3B8',
  0,
  false
from public.tbl_user as user_profile
where user_profile.email = 'james@example.com'
on conflict (user_id, lower(name)) where deleted_at is null do update
set
  color = excluded.color,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default,
  updated_at = now();

update public.tbl_task as task
set priority_id = urgent.priority_id
from public.tbl_priority_level as urgent
where task.user_id = urgent.user_id
  and task.title = 'Prepare sprint notes'
  and urgent.name = 'Urgent';

update public.tbl_task as task
set priority_id = someday.priority_id
from public.tbl_priority_level as someday
where task.user_id = someday.user_id
  and task.title = 'Book weekend groceries'
  and someday.name = 'Someday';

insert into public.tbl_label (user_id, name, color, sort_order)
select user_profile.user_id, 'Alpha', '#2563eb', 0
from public.tbl_user as user_profile
where user_profile.email = 'james@example.com'
on conflict (user_id, name) do update
set
  color = excluded.color,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.tbl_label (user_id, name, color, sort_order)
select user_profile.user_id, 'Beta', '#D97706', 1
from public.tbl_user as user_profile
where user_profile.email = 'james@example.com'
on conflict (user_id, name) do update
set
  color = excluded.color,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.tbl_label (user_id, name, color, sort_order)
select user_profile.user_id, 'Later', '#7C3AED', 2
from public.tbl_user as user_profile
where user_profile.email = 'james@example.com'
on conflict (user_id, name) do update
set
  color = excluded.color,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.tbl_task_label (task_id, label_id)
select task.task_id, label.label_id
from public.tbl_task as task
join public.tbl_user as user_profile on user_profile.user_id = task.user_id
join public.tbl_label as label
  on label.user_id = user_profile.user_id
  and label.name = 'Alpha'
where user_profile.email = 'james@example.com'
  and task.title = 'Prepare sprint notes'
on conflict (task_id, label_id) do nothing;

insert into public.tbl_task_label (task_id, label_id)
select task.task_id, label.label_id
from public.tbl_task as task
join public.tbl_user as user_profile on user_profile.user_id = task.user_id
join public.tbl_label as label
  on label.user_id = user_profile.user_id
  and label.name = 'Beta'
where user_profile.email = 'james@example.com'
  and task.title = 'Book weekend groceries'
on conflict (task_id, label_id) do nothing;

insert into public.tbl_project (
  user_id,
  name,
  description,
  color,
  is_inbox,
  is_favorite,
  is_archived,
  sort_order
)
select
  profile.user_id,
  expected.name,
  expected.description,
  expected.color,
  false,
  expected.is_favorite,
  false,
  expected.sort_order
from (
  values
    ('james@example.com', 'Work', 'Current priorities and deadlines', '#f59e0b', true, 0),
    ('james@example.com', 'Home', 'Weekend errands and household tasks', '#10b981', false, 1),
    ('harvey@example.com', 'Client Projects', 'Client deliverables and meetings', '#3b82f6', true, 0),
    ('alex@example.com', 'Learning', 'Courses, notes, and references', '#8b5cf6', false, 0)
) as expected(email, name, description, color, is_favorite, sort_order)
join auth.users as auth_user on auth_user.email = expected.email
join public.tbl_user as profile on profile.user_id = auth_user.id
where not exists (
  select 1
  from public.tbl_project as existing
  where existing.user_id = profile.user_id
    and existing.name = expected.name
    and existing.deleted_at is null
);

with additional_users(email) as (
  values
    ('olivia@example.com'),
    ('ethan@example.com'),
    ('mia@example.com'),
    ('rafael@example.com'),
    ('grace@example.com'),
    ('felix@example.com'),
    ('amina@example.com'),
    ('priya@example.com'),
    ('kenji@example.com'),
    ('sofia@example.com'),
    ('ava@example.com'),
    ('noah@example.com')
),
project_fixtures(name, description, color, is_favorite, sort_order) as (
  values
    ('Work', 'Current priorities, projects, and deadlines', '#2563eb', true, 0),
    ('Home', 'Household plans and personal errands', '#16a34a', false, 1),
    ('Learning', 'Courses, reading, and practice', '#d97706', false, 2)
)
insert into public.tbl_project (
  user_id,
  name,
  description,
  color,
  is_inbox,
  is_favorite,
  is_archived,
  sort_order
)
select
  auth_user.id,
  project_fixtures.name,
  project_fixtures.description,
  project_fixtures.color,
  false,
  project_fixtures.is_favorite,
  false,
  project_fixtures.sort_order
from additional_users
join auth.users as auth_user on auth_user.email = additional_users.email
cross join project_fixtures
where not exists (
  select 1
  from public.tbl_project as existing
  where existing.user_id = auth_user.id
    and existing.name = project_fixtures.name
);

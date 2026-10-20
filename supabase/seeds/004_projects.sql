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
join public.tbl_user as profile on profile.user_id = auth_user.id;

insert into public.tbl_project (user_id, name, is_inbox)
select profile.user_id, 'Inbox', true
from (
  values
    ('james@example.com'),
    ('harvey@example.com'),
    ('alex@example.com')
) as expected(email)
join auth.users as auth_user on auth_user.email = expected.email
join public.tbl_user as profile on profile.user_id = auth_user.id
on conflict (user_id) where is_inbox and deleted_at is null do nothing;

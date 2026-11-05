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
)
insert into public.tbl_project (user_id, name, is_inbox)
select auth_user.id, 'Inbox', true
from additional_users
join auth.users as auth_user on auth_user.email = additional_users.email
on conflict (user_id) where is_inbox and deleted_at is null do nothing;

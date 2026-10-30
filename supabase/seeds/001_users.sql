insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change_token,
  phone_change,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
values
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'james@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"james"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'harvey@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"harvey"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"alex"}'::jsonb,
    now(),
    now(),
    false,
    false
  )
on conflict do nothing;

update auth.users
set
  instance_id = '00000000-0000-0000-0000-000000000000',
  encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  phone_change_token = '',
  phone_change = '',
  email_change_token_current = '',
  reauthentication_token = '',
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
  raw_user_meta_data = jsonb_build_object(
    'username',
    case email
      when 'james@example.com' then 'james'
      when 'harvey@example.com' then 'harvey'
      when 'alex@example.com' then 'alex'
    end
  ),
  updated_at = now()
where email in (
  'james@example.com',
  'harvey@example.com',
  'alex@example.com'
);

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  auth_user.id::text,
  auth_user.id,
  jsonb_build_object(
    'sub',
    auth_user.id::text,
    'email',
    auth_user.email,
    'email_verified',
    true
  ),
  'email',
  now(),
  now(),
  now()
from auth.users as auth_user
where auth_user.email in (
  'james@example.com',
  'harvey@example.com',
  'alex@example.com'
)
on conflict (provider_id, provider) do update
set
  provider_id = excluded.provider_id,
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = excluded.updated_at;

insert into public.tbl_user (user_id, username, email, timezone)
select
  auth_user.id,
  expected.username,
  expected.email,
  'Asia/Manila'
from (
  values
    ('james', 'james@example.com'),
    ('harvey', 'harvey@example.com'),
    ('alex', 'alex@example.com')
) as expected(username, email)
join auth.users as auth_user on auth_user.email = expected.email
on conflict (user_id) do update
set
  username = excluded.username,
  email = excluded.email,
  timezone = excluded.timezone,
  updated_at = now();

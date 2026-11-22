with expected_users(email) as (
  values
    ('james@example.com'),
    ('harvey@example.com'),
    ('alex@example.com')
),
token_kinds(kind, expires_in) as (
  values
    ('valid', interval '1 day'),
    ('expired', interval '-1 day'),
    ('used', interval '1 day')
),
expected_tokens as (
  select
    auth_user.id as user_id,
    encode(
      extensions.digest(
        'seed-reset-' || split_part(expected.email, '@', 1) || '-' || token_kinds.kind,
        'sha256'
      ),
      'hex'
    ) as token_hash,
    now() + token_kinds.expires_in as expires_at,
    case
      when token_kinds.kind = 'used' then now()
      else null::timestamptz
    end as used_at
  from expected_users as expected
  join auth.users as auth_user on auth_user.email = expected.email
  cross join token_kinds
)
insert into public.password_reset_token (
  user_id,
  token_hash,
  expires_at,
  used_at
)
select user_id, token_hash, expires_at, used_at
from expected_tokens
on conflict (token_hash) do update
set
  user_id = excluded.user_id,
  expires_at = excluded.expires_at,
  used_at = excluded.used_at;

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
insert into public.auth_session (
  user_id,
  token_hash,
  expires_at,
  revoked_at,
  created_at
)
select
  auth_user.id,
  encode(extensions.digest('inactive-session-' || additional_users.email, 'sha256'), 'hex'),
  now() - interval '1 day',
  now() - interval '1 day',
  now() - interval '2 days'
from additional_users
join auth.users as auth_user on auth_user.email = additional_users.email
on conflict (token_hash) do update
set
  expires_at = excluded.expires_at,
  revoked_at = excluded.revoked_at,
  created_at = excluded.created_at;

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
token_kinds(kind, expires_at, used_at) as (
  values
    ('expired', now() - interval '2 days', null::timestamptz),
    ('used', now() + interval '1 day', now() - interval '1 hour')
)
insert into public.password_reset_token (
  user_id,
  token_hash,
  expires_at,
  used_at
)
select
  auth_user.id,
  encode(
    extensions.digest(
      'expired-reset-' || additional_users.email || '-' || token_kinds.kind,
      'sha256'
    ),
    'hex'
  ),
  token_kinds.expires_at,
  token_kinds.used_at
from additional_users
join auth.users as auth_user on auth_user.email = additional_users.email
cross join token_kinds
on conflict (token_hash) do update
set
  expires_at = excluded.expires_at,
  used_at = excluded.used_at;

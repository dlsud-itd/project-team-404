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

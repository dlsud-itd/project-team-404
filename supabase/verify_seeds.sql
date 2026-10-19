with expected_users(username, email) as (
  values
    ('james', 'james@example.com'),
    ('harvey', 'harvey@example.com'),
    ('alex', 'alex@example.com')
),
user_seed_status as (
  select
    bool_and(
      auth_user.id is not null
      and substring(auth_user.id::text from 15 for 1) = '4'
      and lower(substring(auth_user.id::text from 20 for 1)) in (
        '8',
        '9',
        'a',
        'b'
      )
      and auth_user.email_confirmed_at is not null
      and auth_user.encrypted_password =
        extensions.crypt('password123', auth_user.encrypted_password)
      and identity.user_id = auth_user.id
      and identity.identity_data ->> 'email' = expected.email
      and profile.user_id = auth_user.id
      and profile.username = expected.username
      and profile.email = expected.email
      and profile.timezone is not null
      and profile.created_at is not null
      and profile.updated_at is not null
      and profile.deleted_at is null
    ) as passed
  from expected_users as expected
  left join auth.users as auth_user on auth_user.email = expected.email
  left join auth.identities as identity
    on identity.user_id = auth_user.id
    and identity.provider = 'email'
  left join public.tbl_user as profile on profile.user_id = auth_user.id
),
inbox_seed_status as (
  select
    bool_and(
      (
        select count(*)
        from public.tbl_project as project
        where project.user_id = auth_user.id
          and project.is_inbox
          and project.deleted_at is null
      ) = 1
      and exists (
        select 1
        from public.tbl_project as project
        where project.user_id = auth_user.id
          and project.name = 'Inbox'
          and project.is_inbox
          and project.deleted_at is null
      )
    ) as passed
  from expected_users as expected
  left join auth.users as auth_user on auth_user.email = expected.email
),
expected_reset_tokens(email, token_kind) as (
  select expected.email, token_kind.kind
  from (values
    ('james@example.com'),
    ('harvey@example.com'),
    ('alex@example.com')
  ) as expected(email)
  cross join (values ('valid'), ('expired'), ('used')) as token_kind(kind)
),
reset_token_seed_status as (
  select bool_and(
    auth_user.id is not null
    and reset_token.id is not null
    and reset_token.user_id = auth_user.id
    and case expected.token_kind
      when 'valid' then reset_token.expires_at > now()
        and reset_token.used_at is null
      when 'expired' then reset_token.expires_at <= now()
        and reset_token.used_at is null
      when 'used' then reset_token.used_at is not null
      else false
    end
  ) as passed
  from expected_reset_tokens as expected
  left join auth.users as auth_user on auth_user.email = expected.email
  left join public.password_reset_token as reset_token
    on reset_token.token_hash = encode(
      extensions.digest(
        'seed-reset-' || split_part(expected.email, '@', 1) || '-' || expected.token_kind,
        'sha256'
      ),
      'hex'
    )
)
select
  '001_users.sql' as seed_file,
  case when passed then 'PASS' else 'FAIL' end as status,
  case
    when passed then 'All three Auth users have UUIDv4 IDs, matching identities and profiles, the shared password, and populated profile fields.'
    else 'One or more Auth users, UUIDs, identities, passwords, or profile fields are missing or incorrect.'
  end as details
from user_seed_status
union all
select
  '002_inbox_projects.sql' as seed_file,
  case when passed then 'PASS' else 'FAIL' end as status,
  case
    when passed then 'Each seeded user has exactly one active Inbox.'
    else 'One or more seeded users do not have exactly one active Inbox.'
  end as details
from inbox_seed_status
union all
select
  '003_password_reset_tokens.sql' as seed_file,
  case when passed then 'PASS' else 'FAIL' end as status,
  case
    when passed then 'Each seeded user has a hashed valid token, an expired token, and a used token.'
    else 'One or more seeded users are missing a correctly hashed valid, expired, or used reset token.'
  end as details
from reset_token_seed_status
order by seed_file;

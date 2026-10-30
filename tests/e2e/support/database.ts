import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { URL, URLSearchParams } from 'node:url';
import { seedAccounts } from './seed-data';

type ProfileRow = {
  user_id: string;
  username: string;
  email: string;
  timezone: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type SeedSnapshot = {
  profile: ProfileRow;
  sessions: Record<string, unknown>[];
  resetTokens: Record<string, unknown>[];
};

type E2EState = {
  createdUserIds: string[];
  seeds: Record<string, SeedSnapshot>;
};

type AuthUser = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
};

function statePath(): string {
  const path = process.env['E2E_STATE_FILE'];
  if (!path) throw new Error('E2E_STATE_FILE is required by the E2E runner');
  return path;
}

function configuredSupabase(): { url: string; key: string } {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key)
    throw new Error('The local Supabase URL and service-role key are required');

  const parsedUrl = new URL(url);
  const isLoopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(
    parsedUrl.hostname
  );
  const isRemoteTest =
    process.env['E2E_SUPABASE_TARGET'] === 'remote-test' &&
    parsedUrl.protocol === 'https:' &&
    parsedUrl.hostname.endsWith('.supabase.co');
  if (!isLoopback && !isRemoteTest) {
    throw new Error(
      'E2E tests may only connect to local Supabase or the explicitly selected remote test project'
    );
  }
  return { url: url.replace(/\/+$/, ''), key };
}

async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { url, key } = configuredSupabase();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Local Supabase request ${init.method ?? 'GET'} ${path} failed (${response.status})`
    );
  }
  const body = await response.text();
  if (!body && response.status === 204) return undefined as T;
  if (
    !body &&
    new Headers(init.headers).get('Prefer')?.includes('return=minimal')
  ) {
    return undefined as T;
  }
  if (!body) {
    throw new Error(
      `Local Supabase request ${init.method ?? 'GET'} ${path} returned an empty response`
    );
  }
  return JSON.parse(body) as T;
}

async function profileForEmail(email: string): Promise<ProfileRow> {
  const query = new URLSearchParams({
    select:
      'user_id,username,email,timezone,last_login_at,created_at,updated_at,deleted_at',
    email: `eq.${email}`,
  });
  const rows = await supabaseRequest<ProfileRow[]>(
    `/rest/v1/tbl_user?${query}`
  );
  const profile = rows[0];
  if (!profile)
    throw new Error(
      `Seed profile is missing for ${email}; seed the local database first`
    );
  return profile;
}

async function rowsForUser(
  table: 'auth_session' | 'password_reset_token',
  userId: string
) {
  const query = new URLSearchParams({ select: '*', user_id: `eq.${userId}` });
  return supabaseRequest<Record<string, unknown>[]>(
    `/rest/v1/${table}?${query}`
  );
}

async function authUser(userId: string): Promise<AuthUser> {
  return supabaseRequest<AuthUser>(
    `/auth/v1/admin/users/${encodeURIComponent(userId)}`
  );
}

async function updateAuthUser(
  userId: string,
  account: (typeof seedAccounts)[number]
) {
  const user = await authUser(userId);
  await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      password: account.password,
      user_metadata: { ...user.user_metadata, username: account.username },
    }),
  });
}

async function replaceUserRows(
  table: 'auth_session' | 'password_reset_token',
  userId: string,
  rows: Record<string, unknown>[]
) {
  const query = new URLSearchParams({ user_id: `eq.${userId}` });
  await supabaseRequest(`/rest/v1/${table}?${query}`, { method: 'DELETE' });
  if (rows.length) {
    await supabaseRequest(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
    });
  }
}

function readState(): E2EState {
  return JSON.parse(readFileSync(statePath(), 'utf8')) as E2EState;
}

function writeState(state: E2EState): void {
  writeFileSync(statePath(), JSON.stringify(state, null, 2));
}

export async function captureSeedState(): Promise<E2EState> {
  const seeds: E2EState['seeds'] = {};
  for (const account of seedAccounts) {
    const profile = await profileForEmail(account.email);
    const auth = await authUser(profile.user_id);
    if (
      auth.email.toLowerCase() !== account.email ||
      profile.username !== account.username ||
      profile.timezone !== account.timezone ||
      profile.deleted_at !== null ||
      auth.user_metadata.username !== account.username
    ) {
      throw new Error(
        `Seed account ${account.email} differs from seed-data.ts; restore local seeds first`
      );
    }
    const resetTokens = await rowsForUser(
      'password_reset_token',
      profile.user_id
    );
    for (const kind of ['valid', 'expired', 'used'] as const) {
      const token = `seed-reset-${account.username}-${kind}`;
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const seededToken = resetTokens.find(
        (row) => row['token_hash'] === tokenHash
      );
      if (!seededToken) {
        throw new Error(
          `Seed reset token '${kind}' is missing for ${account.username}`
        );
      }
      const expired =
        Date.parse(String(seededToken['expires_at'])) <= Date.now();
      const used = seededToken['used_at'] !== null;
      if (
        (kind === 'expired' && (!expired || used)) ||
        (kind === 'used' && (expired || !used)) ||
        (kind === 'valid' && (expired || used))
      ) {
        throw new Error(
          `Seed reset token '${kind}' has the wrong status for ${account.username}`
        );
      }
    }
    seeds[account.email] = {
      profile,
      sessions: await rowsForUser('auth_session', profile.user_id),
      resetTokens,
    };
    if ((await inboxProjectsForUser(profile.user_id)).length !== 1) {
      throw new Error(
        `Seed account ${account.username} must have exactly one active Inbox`
      );
    }
  }
  return { createdUserIds: [], seeds };
}

export async function initializeSeedState(): Promise<void> {
  const state = await captureSeedState();
  writeState(state);
  for (const account of seedAccounts) await restoreSeedAccount(account.email);
}

export function recordCreatedUser(userId: string): void {
  const state = readState();
  if (!state.createdUserIds.includes(userId)) state.createdUserIds.push(userId);
  writeState(state);
}

async function deleteAuthUser(userId: string): Promise<void> {
  const { url, key } = configuredSupabase();
  const response = await fetch(
    `${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not remove E2E account (${response.status})`);
  }
}

export async function deleteCreatedUsers(): Promise<void> {
  const state = readState();
  for (const userId of state.createdUserIds) await deleteAuthUser(userId);
  state.createdUserIds = [];
  writeState(state);
}

export async function deleteUserByEmail(email: string): Promise<void> {
  const query = new URLSearchParams({
    select: 'user_id',
    email: `eq.${email}`,
  });
  const rows = await supabaseRequest<{ user_id: string }[]>(
    `/rest/v1/tbl_user?${query}`
  );
  for (const row of rows) await deleteAuthUser(row.user_id);
}

export async function restoreSeedAccount(email: string): Promise<void> {
  const state = readState();
  const snapshot = state.seeds[email];
  const account = seedAccounts.find((seed) => seed.email === email);
  if (!snapshot || !account)
    throw new Error(`No captured seed state for ${email}`);

  const userId = snapshot.profile.user_id;
  await updateAuthUser(userId, account);
  const profile = {
    username: snapshot.profile.username,
    email: snapshot.profile.email,
    timezone: snapshot.profile.timezone,
    last_login_at: snapshot.profile.last_login_at,
    created_at: snapshot.profile.created_at,
    updated_at: snapshot.profile.updated_at,
    deleted_at: snapshot.profile.deleted_at,
  };
  await supabaseRequest(
    `/rest/v1/tbl_user?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(profile),
    }
  );
  await replaceUserRows('auth_session', userId, snapshot.sessions);
  await replaceUserRows('password_reset_token', userId, snapshot.resetTokens);
}

export async function restoreAllSeedAccounts(): Promise<void> {
  for (const account of seedAccounts) await restoreSeedAccount(account.email);
}

export async function inboxProjectsForUser(
  userId: string
): Promise<{ project_id: number }[]> {
  const query = new URLSearchParams({
    select: 'project_id',
    user_id: `eq.${userId}`,
    is_inbox: 'eq.true',
    deleted_at: 'is.null',
  });
  return supabaseRequest(`/rest/v1/tbl_project?${query}`);
}

export async function profileForUser(email: string): Promise<ProfileRow> {
  return profileForEmail(email);
}

export async function startOfBackendLog(): Promise<number> {
  const path = process.env['E2E_BACKEND_LOG_FILE'];
  if (!path)
    throw new Error('E2E_BACKEND_LOG_FILE is required by the E2E runner');
  try {
    return readFileSync(path, 'utf8').length;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return 0;
    throw error;
  }
}

export async function waitForResetUrl(
  email: string,
  offset: number
): Promise<string> {
  const path = process.env['E2E_BACKEND_LOG_FILE'];
  if (!path)
    throw new Error('E2E_BACKEND_LOG_FILE is required by the E2E runner');

  const deadline = Date.now() + 10_000;
  let latestOutput = '';
  while (Date.now() < deadline) {
    let output = '';
    try {
      latestOutput = readFileSync(path, 'utf8');
      output = latestOutput.slice(offset);
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
    }
    const marker = `Password reset email for ${email}:`;
    const message = output.lastIndexOf(marker);
    if (message !== -1) {
      const match = output
        .slice(message)
        .match(/http:\/\/localhost:4200\/reset-password\?token=[^\s]+/);
      if (match) return match[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const diagnostics = latestOutput
    .slice(offset)
    .split(/\r?\n/)
    .filter((line) =>
      /E2E debug mailer|Server listening|Unhandled API error|Password reset email/.test(
        line
      )
    )
    .map((line) => line.replace(/(token(?:=|:|\s+))\S+/gi, '$1[redacted]'))
    .slice(-10)
    .join('\n');
  throw new Error(
    `No console reset link was captured for ${email}. Backend log:\n${diagnostics || '(no relevant log lines)'}`
  );
}

export async function backendLogHasResetLink(
  email: string,
  offset: number
): Promise<boolean> {
  const path = process.env['E2E_BACKEND_LOG_FILE'];
  if (!path)
    throw new Error('E2E_BACKEND_LOG_FILE is required by the E2E runner');
  try {
    return readFileSync(path, 'utf8')
      .slice(offset)
      .includes(`Password reset email for ${email}:`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return false;
    throw error;
  }
}

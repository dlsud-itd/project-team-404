import { randomBytes, randomUUID } from 'node:crypto';
import type { Express } from 'express';
import { request } from '../helpers/request';

export type TestSupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

export type IntegrationAccount = {
  id: string;
  username: string;
  email: string;
  password: string;
  timezone: string;
  inboxProjectId: number;
  token: string;
};

const authUserIds = new Set<string>();

export function configureSupabaseTest(): TestSupabaseConfig | null {
  const url = process.env.SUPABASE_TEST_URL;
  const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  if (!url && !serviceRoleKey) {
    return null;
  }
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Set both SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_ROLE_KEY'
    );
  }

  const databaseUrl = process.env.SUPABASE_TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'Set SUPABASE_TEST_DATABASE_URL to the isolated test database'
    );
  }
  const directUrl = process.env.SUPABASE_TEST_DIRECT_URL ?? databaseUrl;

  if (process.env.SUPABASE_URL === url) {
    throw new Error(
      'Refusing to run integration tests against SUPABASE_URL; use a separate test project'
    );
  }

  new URL(url);
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = directUrl;

  return { url: url.replace(/\/+$/, ''), serviceRoleKey };
}

export async function loginAs(
  app: Express,
  config: TestSupabaseConfig
): Promise<IntegrationAccount> {
  const suffix = randomUUID().replaceAll('-', '');
  const username = `integration_${suffix}`;
  const email = `${username}@example.test`;
  const password = randomBytes(32).toString('base64url');
  const timezone = 'Asia/Manila';

  const authUser = await supabaseRequest<{ id: string }>(
    config,
    '/auth/v1/admin/users',
    {
      method: 'POST',
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      },
    }
  );
  authUserIds.add(authUser.id);

  const { prisma } = await import('../../shared/db/prisma.client');
  const user = await prisma.user.create({
    data: {
      id: authUser.id,
      username,
      email,
      timezone,
      projects: {
        create: { name: 'Inbox', isInbox: true },
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      timezone: true,
      projects: {
        where: { isInbox: true, deletedAt: null },
        select: { id: true },
      },
    },
  });
  const inboxProjectId = user.projects[0]?.id;
  if (!user.email || !user.timezone || inboxProjectId === undefined) {
    throw new Error(
      'Integration account was created without a complete profile and Inbox'
    );
  }

  const response = await request(app, '/api/auth/login', {
    method: 'POST',
    body: { identifier: user.email, password },
  });
  if (response.status !== 200 || !isLoginResponse(response.body)) {
    throw new Error(
      `Could not log in integration account (HTTP ${response.status})`
    );
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password,
    timezone: user.timezone,
    inboxProjectId,
    token: response.body.token,
  };
}

export async function deleteIntegrationAccounts(
  config: TestSupabaseConfig
): Promise<void> {
  const failures: Error[] = [];
  for (const userId of authUserIds) {
    try {
      await supabaseRequest(
        config,
        `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      );
      authUserIds.delete(userId);
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (failures.length) {
    throw new AggregateError(
      failures,
      'Failed to clean up integration accounts'
    );
  }
}

export async function setSessionExpiry(
  config: TestSupabaseConfig,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  await supabaseRequest(
    config,
    `/rest/v1/auth_session?token_hash=eq.${encodeURIComponent(tokenHash)}`,
    {
      method: 'PATCH',
      body: { expires_at: expiresAt.toISOString() },
      prefer: 'return=minimal',
    }
  );
}

export async function findSessionByTokenHash(
  config: TestSupabaseConfig,
  tokenHash: string
): Promise<Array<{ token_hash: string; user_id: string }>> {
  return supabaseRequest(
    config,
    `/rest/v1/auth_session?select=token_hash,user_id&token_hash=eq.${encodeURIComponent(tokenHash)}`,
    { method: 'GET' }
  );
}

export type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export async function findPasswordResetTokens(
  config: TestSupabaseConfig,
  userId: string
): Promise<PasswordResetTokenRow[]> {
  return supabaseRequest(
    config,
    `/rest/v1/password_reset_token?select=id,user_id,token_hash,expires_at,used_at,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`,
    { method: 'GET' }
  );
}

export async function setPasswordResetTokenState(
  config: TestSupabaseConfig,
  tokenHash: string,
  values: { expiresAt?: Date; usedAt?: Date | null }
): Promise<void> {
  const body: { expires_at?: string; used_at?: string | null } = {};
  if (values.expiresAt) {
    body.expires_at = values.expiresAt.toISOString();
  }
  if (values.usedAt !== undefined) {
    body.used_at = values.usedAt?.toISOString() ?? null;
  }
  await supabaseRequest(
    config,
    `/rest/v1/password_reset_token?token_hash=eq.${encodeURIComponent(tokenHash)}`,
    {
      method: 'PATCH',
      body,
      prefer: 'return=minimal',
    }
  );
}

async function supabaseRequest<T = unknown>(
  config: TestSupabaseConfig,
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    prefer?: string;
  }
): Promise<T> {
  const response = await fetch(new URL(path, `${config.url}/`), {
    method: options.method,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `******`,
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    throw new Error(`Supabase test request failed (HTTP ${response.status})`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function isLoginResponse(
  body: unknown
): body is { token: string; user: { id: string } } {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const response = body as { token?: unknown; user?: { id?: unknown } };
  return (
    typeof response.token === 'string' && typeof response.user?.id === 'string'
  );
}

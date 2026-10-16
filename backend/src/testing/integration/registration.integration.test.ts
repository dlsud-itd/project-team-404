import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createAuthRouter } from '../../features/auth/auth.routes';
import { SupabaseAuthRepository } from '../../features/auth/auth.repository';
import { request } from '../helpers/request';

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const integrationEnabled = Boolean(supabaseUrl && serviceRoleKey);

if (Boolean(supabaseUrl) !== Boolean(serviceRoleKey)) {
  throw new Error(
    'Set both SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_ROLE_KEY to run registration integration tests'
  );
}

if (
  supabaseUrl &&
  process.env.SUPABASE_URL &&
  new URL(supabaseUrl).origin === new URL(process.env.SUPABASE_URL).origin
) {
  throw new Error(
    'SUPABASE_TEST_URL must not match SUPABASE_URL; refusing to run integration tests against the configured non-test project'
  );
}

type TestAccount = {
  email: string;
  username: string;
};

type SignupResult = {
  userId: string;
  inboxProjectId: number;
};

type UserRow = {
  user_id: string;
  username: string;
  email: string;
  timezone: string;
};

type ProjectRow = {
  project_id: number;
  user_id: string;
  name: string;
  is_inbox: boolean;
};

function parseSignupResult(body: unknown): SignupResult {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('userId' in body) ||
    typeof body.userId !== 'string' ||
    !('inboxProjectId' in body) ||
    typeof body.inboxProjectId !== 'number'
  ) {
    throw new Error('Signup endpoint returned an invalid success response');
  }
  return { userId: body.userId, inboxProjectId: body.inboxProjectId };
}

const accountsToClean: TestAccount[] = [];

function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/auth',
    createAuthRouter(new SupabaseAuthRepository(supabaseUrl, serviceRoleKey))
  );
  return app;
}

async function getRows<T>(
  table: string,
  query: Record<string, string>
): Promise<T[]> {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase test credentials are not configured');
  }

  const url = new URL(
    `rest/v1/${table}`,
    `${supabaseUrl.replace(/\/+$/, '')}/`
  );
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Supabase test database query failed with status ${response.status}`
    );
  }
  return (await response.json()) as T[];
}

async function deleteAuthUser(userId: string): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase test credentials are not configured');
  }

  const response = await fetch(
    new URL(
      `auth/v1/admin/users/${encodeURIComponent(userId)}`,
      `${supabaseUrl.replace(/\/+$/, '')}/`
    ),
    {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(
      `Supabase test user cleanup failed with status ${response.status}`
    );
  }
}

async function cleanupAccount(account: TestAccount): Promise<void> {
  const users = await getRows<Pick<UserRow, 'user_id'>>('tbl_user', {
    select: 'user_id',
    email: `eq.${account.email}`,
  });
  await Promise.all(users.map(({ user_id }) => deleteAuthUser(user_id)));
}

function makeAccount(): TestAccount {
  const id = crypto.randomUUID().replaceAll('-', '');
  const account = {
    username: `integration_${id}`,
    email: `integration_${id}@example.com`,
  };
  accountsToClean.push(account);
  return account;
}

const integrationDescribe = integrationEnabled ? describe : describe.skip;

integrationDescribe('registration against a Supabase test database', () => {
  afterEach(async () => {
    const accounts = accountsToClean.splice(0);
    await Promise.all(accounts.map(cleanupAccount));
  });

  it('creates the Auth user, profile, and one default Inbox', async () => {
    const account = makeAccount();
    const response = await request(createApp(), '/api/auth/signup', {
      method: 'POST',
      body: {
        ...account,
        password: 'integration-test-password',
        confirmPassword: 'integration-test-password',
        timezone: 'Asia/Manila',
      },
    });

    expect(response.status).toBe(201);
    const result = parseSignupResult(response.body);
    const [user] = await getRows<UserRow>('tbl_user', {
      select: 'user_id,username,email,timezone',
      user_id: `eq.${result.userId}`,
    });
    const inboxes = await getRows<ProjectRow>('tbl_project', {
      select: 'project_id,user_id,name,is_inbox',
      user_id: `eq.${result.userId}`,
      name: 'eq.Inbox',
    });

    expect(user).toMatchObject({
      user_id: result.userId,
      username: account.username,
      email: account.email,
      timezone: 'Asia/Manila',
    });
    expect(inboxes).toHaveLength(1);
    expect(inboxes[0]).toMatchObject({
      project_id: result.inboxProjectId,
      user_id: result.userId,
      name: 'Inbox',
      is_inbox: true,
    });
  });

  it('allows only one of two simultaneous registrations with the same email', async () => {
    const account = makeAccount();
    const payload = {
      ...account,
      password: 'integration-test-password',
      confirmPassword: 'integration-test-password',
      timezone: 'Asia/Manila',
    };

    const responses = await Promise.all([
      request(createApp(), '/api/auth/signup', {
        method: 'POST',
        body: payload,
      }),
      request(createApp(), '/api/auth/signup', {
        method: 'POST',
        body: payload,
      }),
    ]);

    const successes = responses.filter(({ status }) => status === 201);
    const conflicts = responses.filter(({ status }) => status === 409);
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);

    const result = parseSignupResult(successes[0]?.body);
    const users = await getRows<UserRow>('tbl_user', {
      select: 'user_id,username,email,timezone',
      email: `eq.${account.email}`,
    });
    const inboxes = await getRows<ProjectRow>('tbl_project', {
      select: 'project_id,user_id,name,is_inbox',
      user_id: `eq.${result.userId}`,
      name: 'eq.Inbox',
    });

    expect(users).toHaveLength(1);
    expect(users[0]?.user_id).toBe(result.userId);
    expect(inboxes).toHaveLength(1);
    expect(inboxes[0]?.is_inbox).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configureSupabaseTest } from './supabase-test-support';

const environmentNames = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'DIRECT_URL',
  'SUPABASE_TEST_URL',
  'SUPABASE_TEST_SERVICE_ROLE_KEY',
  'SUPABASE_TEST_DATABASE_URL',
  'SUPABASE_TEST_DIRECT_URL',
  'TEST_DATABASE_URL',
  'TEST_DIRECT_URL',
] as const;
const originalEnvironment = new Map(
  environmentNames.map((name) => [name, process.env[name]])
);

beforeEach(() => {
  for (const name of environmentNames) {
    delete process.env[name];
  }
  process.env.SUPABASE_URL = 'https://development.supabase.co';
  process.env.SUPABASE_TEST_URL = 'http://127.0.0.1:55321';
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY = 'local-test-key';
  process.env.SUPABASE_TEST_DATABASE_URL =
    'postgresql://postgres:postgres@127.0.0.1:55432/postgres';
});

afterEach(() => {
  for (const [name, value] of originalEnvironment) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe('configureSupabaseTest', () => {
  it('accepts local API and database URLs', () => {
    expect(configureSupabaseTest()).toEqual({
      url: 'http://127.0.0.1:55321',
      serviceRoleKey: 'local-test-key',
    });
  });

  it('rejects a hosted test API URL', () => {
    process.env.SUPABASE_TEST_URL = 'https://hosted.supabase.co';

    expect(() => configureSupabaseTest()).toThrow(
      'SUPABASE_TEST_URL must point to localhost, 127.0.0.1, or ::1'
    );
  });

  it('rejects a hosted test database URL', () => {
    process.env.SUPABASE_TEST_DATABASE_URL =
      'postgresql://postgres:password@db.hosted.supabase.co:5432/postgres';

    expect(() => configureSupabaseTest()).toThrow(
      'SUPABASE_TEST_DATABASE_URL must point to localhost, 127.0.0.1, or ::1'
    );
  });

  it('rejects a hosted direct database URL', () => {
    process.env.SUPABASE_TEST_DIRECT_URL =
      'postgresql://postgres:password@db.hosted.supabase.co:5432/postgres';

    expect(() => configureSupabaseTest()).toThrow(
      'SUPABASE_TEST_DIRECT_URL must point to localhost, 127.0.0.1, or ::1'
    );
  });
});

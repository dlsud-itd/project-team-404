import { describe, expect, it } from 'vitest';
import { toPublicUser, toUser } from './user.model';

describe('user model mapping', () => {
  it('maps a database record into a normalized User and PublicUser', () => {
    const user = toUser({
      id: 'user-1',
      username: 'harvey',
      email: 'Harvey@example.com',
      timezone: 'Asia/Manila',
      deletedAt: null,
    });
    expect(user).toEqual({
      id: 'user-1',
      username: 'harvey',
      email: 'harvey@example.com',
      timezone: 'Asia/Manila',
      deletedAt: null,
    });
    expect(user && toPublicUser(user, 14)).toEqual({
      id: 'user-1',
      username: 'harvey',
      email: 'harvey@example.com',
      timezone: 'Asia/Manila',
      inboxProjectId: 14,
    });
  });

  it('rejects database rows missing required public profile fields', () => {
    expect(
      toUser({
        id: 'user-1',
        username: 'harvey',
        email: null,
        timezone: null,
        deletedAt: null,
      }),
    ).toBeNull();
  });
});

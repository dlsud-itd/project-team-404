export type UserRecord = {
  id: string;
  username: string;
  email: string | null;
  timezone: string | null;
  deletedAt: Date | null;
};

export type User = {
  id: string;
  username: string;
  email: string;
  timezone: string;
  deletedAt: Date | null;
};

export type PublicUser = Omit<User, 'deletedAt'> & {
  inboxProjectId: number;
};

export function toUser(record: UserRecord): User | null {
  if (!record.email || !record.timezone) {
    return null;
  }
  return {
    ...record,
    email: record.email.toLowerCase(),
    timezone: record.timezone,
  };
}

export function toPublicUser(user: User, inboxProjectId: number): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    timezone: user.timezone,
    inboxProjectId,
  };
}

export const seedAccounts = [
  {
    username: 'james',
    email: 'james@example.com',
    password: 'password123',
    timezone: 'Asia/Manila',
  },
  {
    username: 'harvey',
    email: 'harvey@example.com',
    password: 'password123',
    timezone: 'Asia/Manila',
  },
  {
    username: 'alex',
    email: 'alex@example.com',
    password: 'password123',
    timezone: 'Asia/Manila',
  },
] as const;

export const seedResetTokens = {
  valid: 'seed-reset-james-valid',
  expired: 'seed-reset-james-expired',
  used: 'seed-reset-james-used',
} as const;

export const tokenStorageKey = 'habittracker.token';

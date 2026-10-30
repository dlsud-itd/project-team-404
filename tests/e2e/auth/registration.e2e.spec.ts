import { expect, test } from '@playwright/test';
import {
  deleteCreatedUsers,
  deleteUserByEmail,
  inboxProjectsForUser,
  recordCreatedUser,
} from '../support/database';
import {
  baseUrl,
  fillRegistration,
  logIn,
  uniqueIdentity,
} from '../support/auth';

let signupEmail: string | undefined;

test.afterEach(async () => {
  try {
    if (signupEmail) await deleteUserByEmail(signupEmail);
  } finally {
    try {
      await deleteCreatedUsers();
    } finally {
      signupEmail = undefined;
    }
  }
});

test('registers, logs in, and receives exactly one Inbox', async ({ page }) => {
  const identity = uniqueIdentity();
  signupEmail = identity.email;
  const password = 'E2e-test-password-2026';
  await page.goto(`${baseUrl}/register`);
  await fillRegistration(page, identity.username, identity.email, password);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === 'http://localhost:3000/api/auth/signup' &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Create account' }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const signup = (await response.json()) as { userId: string };
  recordCreatedUser(signup.userId);

  await expect(
    page.getByRole('heading', { name: 'Account created' })
  ).toBeVisible();
  await logIn(page, identity.email, password);
  await expect.poll(() => inboxProjectsForUser(signup.userId)).toHaveLength(1);
});

test('rejects a taken username, then allows a corrected signup', async ({
  page,
}) => {
  const identity = uniqueIdentity();
  signupEmail = identity.email;
  await page.goto(`${baseUrl}/register`);
  await page.getByLabel('Username', { exact: true }).fill('james');
  await expect(
    page.getByText('Username already taken.', { exact: true })
  ).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(identity.email);
  await expect(
    page.getByText('Email is available', { exact: true })
  ).toBeVisible();
  await page
    .getByLabel('Password', { exact: true })
    .fill('E2e-test-password-2026');
  await page
    .getByLabel('Confirm password', { exact: true })
    .fill('E2e-test-password-2026');
  await expect(
    page.getByText('Username already taken.', { exact: true })
  ).toBeVisible();

  await page.getByLabel('Username', { exact: true }).fill(identity.username);
  await expect(
    page.getByText('Username is available', { exact: true })
  ).toBeVisible();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === 'http://localhost:3000/api/auth/signup' &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Create account' }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const signup = (await response.json()) as { userId: string };
  recordCreatedUser(signup.userId);
  await expect(
    page.getByRole('heading', { name: 'Account created' })
  ).toBeVisible();
  await logIn(page, identity.email, 'E2e-test-password-2026');
  await expect.poll(() => inboxProjectsForUser(signup.userId)).toHaveLength(1);
});

test('rejects an email address that is already registered', async ({
  page,
}) => {
  const identity = uniqueIdentity();
  await page.goto(`${baseUrl}/register`);
  await page.getByLabel('Username', { exact: true }).fill(identity.username);
  await expect(
    page.getByText('Username is available', { exact: true })
  ).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('james@example.com');
  await expect(
    page.getByText('Email already registered.', { exact: true })
  ).toBeVisible();
});

test('rejects mismatched passwords without sending a signup request', async ({
  page,
}) => {
  const identity = uniqueIdentity();
  signupEmail = identity.email;
  let signupRequests = 0;
  page.on('request', (request) => {
    if (request.url() === 'http://localhost:3000/api/auth/signup')
      signupRequests += 1;
  });

  await page.goto(`${baseUrl}/register`);
  await fillRegistration(
    page,
    identity.username,
    identity.email,
    'E2e-test-password-2026',
    'a-different-password'
  );
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByText('Passwords do not match.', { exact: true })
  ).toBeVisible();
  expect(signupRequests).toBe(0);
});

test('disables submit while the registration request is running', async ({
  page,
}) => {
  const identity = uniqueIdentity();
  let releaseSignup!: () => void;
  await page.route('http://localhost:3000/api/auth/signup', async (route) => {
    await new Promise<void>((resolve) => {
      releaseSignup = resolve;
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: '00000000-0000-4000-8000-000000000001',
        inboxProjectId: 1,
      }),
    });
  });

  await page.goto(`${baseUrl}/register`);
  await fillRegistration(page, identity.username, identity.email);
  const requestStarted = page.waitForRequest(
    (request) => request.url() === 'http://localhost:3000/api/auth/signup'
  );
  const submit = page.locator('form button[type="submit"]');
  await submit.click();
  await requestStarted;
  try {
    await expect(submit).toBeDisabled();
  } finally {
    releaseSignup();
  }
  await expect(
    page.getByRole('heading', { name: 'Account created' })
  ).toBeVisible();
});

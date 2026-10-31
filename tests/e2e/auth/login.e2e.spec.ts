import { expect, test } from '@playwright/test';
import {
  baseUrl,
  expectNoToken,
  logIn,
  setToken,
  tokenValues,
} from '../support/auth';
import { seedAccounts } from '../support/seed-data';
import { restoreSeedAccount } from '../support/database';

test.afterEach(async () => {
  await restoreSeedAccount(seedAccounts[0].email);
});

test('restores a session on reload and stays logged out after Back', async ({
  page,
}) => {
  await logIn(page);
  await expect.poll(() => tokenValues(page)).toHaveLength(1);

  await page.reload();
  await expect(page).toHaveURL(/\/home(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: /james/i })).toBeVisible();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expectNoToken(page);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expectNoToken(page);
});

test('accepts username login and shows one generic error for a wrong password', async ({
  page,
}) => {
  await logIn(page, seedAccounts[0].username);
  await expect(page.getByRole('heading', { name: /james/i })).toBeVisible();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email or username').fill(seedAccounts[0].email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('incorrect-e2e-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Incorrect email/username or password.'
  );
  await expect(page.getByRole('alert')).toHaveCount(1);
});

test('redirects protected URLs and clears an invalid session token', async ({
  page,
}) => {
  await page.goto(`${baseUrl}/settings/profile`);
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expectNoToken(page);

  await setToken(page, 'invalid-e2e-session-token');
  await page.goto(`${baseUrl}/home`);
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expectNoToken(page);
});

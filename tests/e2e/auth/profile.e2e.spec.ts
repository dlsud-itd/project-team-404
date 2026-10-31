import { expect, test, type BrowserContext } from '@playwright/test';
import {
  deleteCreatedUsers,
  profileForUser,
  restoreSeedAccount,
} from '../support/database';
import { baseUrl, logIn, uniqueIdentity } from '../support/auth';
import { seedAccounts, tokenStorageKey } from '../support/seed-data';

const james = seedAccounts[0];
let secondContext: BrowserContext | undefined;

test.afterEach(async () => {
  try {
    if (secondContext) await secondContext.close();
  } finally {
    secondContext = undefined;
    try {
      await deleteCreatedUsers();
    } finally {
      await restoreSeedAccount(james.email);
    }
  }
});

test('persists username and timezone, rejects duplicate names, and permits login by the new username', async ({
  page,
}) => {
  const identity = uniqueIdentity();
  const username = identity.username;
  await logIn(page);
  await page.goto(`${baseUrl}/settings/profile`);
  await expect(
    page.getByRole('heading', { name: 'Profile settings' })
  ).toBeVisible();

  const save = page.getByRole('button', { name: 'Save changes' });
  const usernameField = page.getByLabel('Username', { exact: true });
  const timezoneField = page.getByLabel('Timezone', { exact: true });
  await expect(save).toBeDisabled();
  await usernameField.fill('harvey');
  await save.click();
  await expect(page.locator('#profile-username-status')).toContainText(
    /already|taken/i
  );
  const unchanged = await profileForUser(james.email);
  expect([unchanged.username, unchanged.timezone]).toEqual([
    'james',
    'Asia/Manila',
  ]);
  await usernameField.fill('james');
  await expect(save).toBeDisabled();

  await usernameField.fill(username);
  await timezoneField.selectOption('America/New_York');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole('status')).toContainText('Profile updated.');
  await expect
    .poll(async () => {
      const profile = await profileForUser(james.email);
      return [profile.username, profile.timezone];
    })
    .toEqual([username, 'America/New_York']);

  await page.reload();
  await expect(usernameField).toHaveValue(username);
  await expect(timezoneField).toHaveValue('America/New_York');
  await expect(save).toBeDisabled();

  await page.goto(`${baseUrl}/home`);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await logIn(page, username);
});

test('keeps the changing session and revokes another device after a password change', async ({
  browser,
  page,
}) => {
  await logIn(page);
  secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await logIn(secondPage);

  await page.goto(`${baseUrl}/settings/profile`);
  const passwordForm = page.locator('app-change-password-form');
  await passwordForm.getByLabel('Current password').fill(james.password);
  await passwordForm
    .getByLabel('New password', { exact: true })
    .fill('E2e-changed-password-2026');
  await passwordForm
    .getByLabel('Confirm new password')
    .fill('E2e-changed-password-2026');
  await passwordForm.getByRole('button', { name: 'Change password' }).click();
  await expect(passwordForm.getByRole('status')).toContainText(
    'Password changed.'
  );

  await page.goto(`${baseUrl}/settings/profile`);
  await expect(
    page.getByRole('heading', { name: 'Profile settings' })
  ).toBeVisible();
  await secondPage.goto(`${baseUrl}/settings/profile`);
  await expect(secondPage).toHaveURL(/\/login(?:\?.*)?$/);
  await expect
    .poll(() =>
      secondPage.evaluate(
        (key) => ({
          local: localStorage.getItem(key),
          session: sessionStorage.getItem(key),
        }),
        tokenStorageKey
      )
    )
    .toEqual({ local: null, session: null });

  await secondPage.getByLabel('Email or username').fill(james.email);
  await secondPage.getByLabel('Password', { exact: true }).fill(james.password);
  await secondPage.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(secondPage.getByRole('alert')).toHaveText(
    'Incorrect email/username or password.'
  );
  await secondPage
    .getByLabel('Password', { exact: true })
    .fill('E2e-changed-password-2026');
  await secondPage.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(secondPage).toHaveURL(/\/home(?:\?.*)?$/);
});

test('shows a current-password field error for an incorrect password', async ({
  page,
}) => {
  await logIn(page);
  await page.goto(`${baseUrl}/settings/profile`);
  const passwordForm = page.locator('app-change-password-form');
  await passwordForm
    .getByLabel('Current password')
    .fill('wrong-current-password');
  await passwordForm
    .getByLabel('New password', { exact: true })
    .fill('E2e-changed-password-2026');
  await passwordForm
    .getByLabel('Confirm new password')
    .fill('E2e-changed-password-2026');
  await passwordForm.getByRole('button', { name: 'Change password' }).click();
  await expect(
    passwordForm.locator('#current-password-status')
  ).not.toBeEmpty();
  await expect(passwordForm.getByLabel('Current password')).toHaveAttribute(
    'aria-invalid',
    'true'
  );
});

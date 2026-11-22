import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  backendLogHasResetLink,
  restoreSeedAccount,
  startOfBackendLog,
  waitForResetUrl,
} from '../support/database';
import { baseUrl } from '../support/auth';
import { seedAccounts, seedResetTokens } from '../support/seed-data';

const james = seedAccounts[0];

test.afterEach(async () => {
  await restoreSeedAccount(james.email);
});

test('resets the password from the captured local mail, rejects the old password, and uses the link once', async ({
  page,
}) => {
  const logOffset = await startOfBackendLog();
  await page.goto(`${baseUrl}/forgot-password`);
  await page.getByLabel('Email', { exact: true }).fill(james.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText(
    'a reset link has been sent'
  );
  const resetUrl = await waitForResetUrl(james.email, logOffset);

  await page.goto(resetUrl);
  await expect(
    page.getByRole('heading', { name: 'Choose a new password' })
  ).toBeVisible();
  await page
    .getByLabel('New password', { exact: true })
    .fill('E2e-reset-password-2026');
  await page
    .getByLabel('Confirm password', { exact: true })
    .fill('E2e-reset-password-2026');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page).toHaveURL(/\/login\?reset=success$/);

  await page.getByLabel('Email or username').fill(james.email);
  await page.getByLabel('Password', { exact: true }).fill(james.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Incorrect email/username or password.'
  );
  await page
    .getByLabel('Password', { exact: true })
    .fill('E2e-reset-password-2026');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/home(?:\?.*)?$/);

  await page.goto(resetUrl);
  await expect(
    page.getByRole('heading', { name: 'This link has already been used' })
  ).toBeVisible();
});

test('does not disclose unknown email addresses or send a reset email', async ({
  page,
}) => {
  const unknownEmail = `e2e_${randomUUID()}@example.com`;
  const logOffset = await startOfBackendLog();
  await page.goto(`${baseUrl}/forgot-password`);
  await page.getByLabel('Email', { exact: true }).fill(unknownEmail);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText(
    'a reset link has been sent'
  );
  await expect
    .poll(() => backendLogHasResetLink(unknownEmail, logOffset), {
      timeout: 1_500,
    })
    .toBe(false);
});

test('explains why seeded expired and used reset links cannot be used', async ({
  page,
}) => {
  await page.goto(`${baseUrl}/reset-password?token=${seedResetTokens.expired}`);
  await expect(
    page.getByRole('heading', { name: 'This link has expired' })
  ).toBeVisible();

  await page.goto(`${baseUrl}/reset-password?token=${seedResetTokens.used}`);
  await expect(
    page.getByRole('heading', { name: 'This link has already been used' })
  ).toBeVisible();
});

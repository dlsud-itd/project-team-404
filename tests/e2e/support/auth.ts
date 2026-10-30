import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { seedAccounts, tokenStorageKey } from './seed-data';

export const baseUrl = 'http://localhost:4200';

export async function logIn(
  page: Page,
  identifier: string = seedAccounts[0].email,
  password: string = seedAccounts[0].password
): Promise<void> {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel('Email or username').fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/home(?:\?.*)?$/);
}

export async function tokenValues(page: Page): Promise<string[]> {
  return page.evaluate((key) => {
    const values = [localStorage.getItem(key), sessionStorage.getItem(key)];
    return values.filter((value): value is string => value !== null);
  }, tokenStorageKey);
}

export async function expectNoToken(page: Page): Promise<void> {
  await expect.poll(() => tokenValues(page)).toEqual([]);
}

export async function setToken(page: Page, token: string): Promise<void> {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: tokenStorageKey,
    value: token,
  });
}

export function uniqueIdentity(): { username: string; email: string } {
  const uuid = randomUUID();
  return {
    username: `e2e_${uuid}`,
    email: `e2e_${uuid}@example.com`,
  };
}

export async function fillRegistration(
  page: Page,
  username: string,
  email: string,
  password = 'E2e-test-password-2026',
  confirmation = password
): Promise<void> {
  await page.getByLabel('Username', { exact: true }).fill(username);
  await expect(
    page.getByText('Username is available', { exact: true })
  ).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await expect(
    page.getByText('Email is available', { exact: true })
  ).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(confirmation);
}

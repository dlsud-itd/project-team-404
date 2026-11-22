import { expect, test, type Locator, type Page } from '@playwright/test';
import { apiBaseUrl, baseUrl, logIn } from '../support/auth';
import { restoreSeedAccount, serviceRoleRows } from '../support/database';
import { apiToken, userIdFor } from '../support/projects';
import { seedAccounts } from '../support/seed-data';

/**
 * Settings end to end (Sprint 5: E2E-SET-01 to E2E-SET-03).
 *
 * Harvey starts on the defaults from supabase/seeds/008_user_settings.sql (5 tasks, 5 projects,
 * Medium, System). Expected counts come from service-role queries. His settings row is read
 * before each test and written back through PATCH /api/settings afterwards. Alex, another
 * seeded user on the defaults, checks that preferences stay per user.
 */

const [, harvey, alex] = seedAccounts;
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

type SettingsRow = {
  dashboard_task_limit: number;
  dashboard_project_limit: number;
  font_size: string;
  font_family: string;
};

let userId: string;
let saved: SettingsRow;

async function settingsRow(): Promise<SettingsRow> {
  const rows = await serviceRoleRows<SettingsRow>(
    'tbl_user_setting',
    new URLSearchParams({
      select:
        'dashboard_task_limit,dashboard_project_limit,font_size,font_family',
      user_id: `eq.${userId}`,
    })
  );
  if (rows.length !== 1)
    throw new Error('Harvey has no settings row; seed the database');
  return rows[0];
}

async function patchSettings(body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${await apiToken(harvey)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`Could not restore Harvey's settings (${response.status})`);
}

/** The root font size and family the app sets from the saved preferences. */
async function look(page: Page): Promise<{ size: string; family: string }> {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      size: root.style.getPropertyValue('--app-font-size'),
      family: root.style.getPropertyValue('--app-font-family'),
    };
  });
}

async function bodyFontSize(page: Page): Promise<number> {
  return page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.body).fontSize)
  );
}

/** "View all (N)" → N, or null when the widget shows everything. */
async function viewAllTotal(widget: Locator): Promise<number | null> {
  const link = widget.locator('a.view-all');
  if ((await link.count()) === 0) return null;
  const match = (await link.innerText()).match(/View all \((\d+)\)/);
  return match ? Number(match[1]) : null;
}

/** A capped list shows `limit` items and View all (N > limit); a short one shows all, no link. */
async function expectCapped(
  widget: Locator,
  items: Locator,
  limit: number
): Promise<number> {
  await expect(widget).toBeVisible();
  const total = await viewAllTotal(widget);
  const shown = await items.count();
  if (total === null) {
    expect(shown).toBeLessThanOrEqual(limit);
    return shown;
  }
  expect(total).toBeGreaterThan(limit);
  expect(shown).toBe(limit);
  return total;
}

/** No two boxes overlap (a shared edge is fine). */
async function expectNoOverlap(widgets: Locator[]): Promise<void> {
  // Page coordinates, so widgets below the fold compare correctly.
  const boxes = [];
  for (const widget of widgets) {
    const box = await widget.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    });
    expect(box.width * box.height, 'widget has a size').toBeGreaterThan(0);
    boxes.push(box);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapX =
        Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY =
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      expect(
        overlapX > 1 && overlapY > 1,
        `widgets ${i} and ${j} overlap by ${overlapX.toFixed(1)}×${overlapY.toFixed(1)}px`
      ).toBe(false);
    }
  }
}

test.beforeAll(async () => {
  userId = await userIdFor(harvey);
});

test.beforeEach(async () => {
  saved = await settingsRow();
  expect(saved).toEqual({
    dashboard_task_limit: 5,
    dashboard_project_limit: 5,
    font_size: 'medium',
    font_family: 'system',
  });
});

test.afterEach(async () => {
  try {
    await patchSettings({
      dashboardTaskLimit: saved.dashboard_task_limit,
      dashboardProjectLimit: saved.dashboard_project_limit,
      fontSize: saved.font_size,
      fontFamily: saved.font_family,
    });
    expect(await settingsRow()).toEqual(saved);
  } finally {
    await restoreSeedAccount(harvey.email);
    await restoreSeedAccount(alex.email);
  }
});

test('Config limits cap every dashboard widget without overlap at desktop and mobile widths', async ({
  page,
}) => {
  const projects = await serviceRoleRows<{ project_id: number }>(
    'tbl_project',
    new URLSearchParams({
      select: 'project_id',
      user_id: `eq.${userId}`,
      is_archived: 'eq.false',
      deleted_at: 'is.null',
    })
  );
  expect(projects.length).toBeGreaterThan(4);

  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/settings/config`);
  await page
    .getByLabel('Tasks per dashboard widget', { exact: true })
    .fill('3');
  await page
    .getByLabel('Projects in the dashboard project list', { exact: true })
    .fill('4');
  const patched = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === '/api/settings'
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const response = await patched;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({
    dashboardTaskLimit: 3,
    dashboardProjectLimit: 4,
  });
  await expect(
    page.getByRole('status').filter({ hasText: 'Dashboard limits saved.' })
  ).toBeVisible();
  expect(await settingsRow()).toMatchObject({
    dashboard_task_limit: 3,
    dashboard_project_limit: 4,
  });

  for (const viewport of VIEWPORTS) {
    await test.step(`${viewport.name} ${viewport.width}px`, async () => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      // The home dashboard: three status columns, All Tasks and the sidebar project list.
      await page.goto(`${baseUrl}/home`);
      const columns = page.locator('app-status-columns section.column');
      await expect(columns).toHaveCount(3);
      const allTasks = page.locator('app-all-tasks section.panel');
      await expect(allTasks.locator('li.task').first()).toBeVisible();
      for (const column of await columns.all()) {
        await expectCapped(column, column.locator('li.task'), 3);
      }
      const taskTotal = await expectCapped(
        allTasks,
        allTasks.locator('li.task'),
        3
      );
      // Harvey has far more than three tasks, so All Tasks must offer View all.
      expect(taskTotal).toBeGreaterThan(3);

      const projectList = page.locator('app-project-list section.card');
      await expect(projectList.locator('li.project')).toHaveCount(4);
      await expect(projectList.locator('a.view-all')).toHaveText(
        `View all (${projects.length})`
      );
      await expectNoOverlap([...(await columns.all()), allTasks, projectList]);

      // The Dashboard page: Current & Upcoming and Overdue.
      await page.goto(`${baseUrl}/dashboard`);
      const current = page.locator('app-current-upcoming-tasks');
      const overdue = page.locator('app-overdue-tasks');
      await expect(current.locator('[role="status"]')).toHaveCount(0);
      await expect(overdue.locator('li').first()).toBeVisible();
      await expectCapped(current, current.locator('li.task'), 3);
      await expectCapped(overdue, overdue.locator('li.task'), 3);
      await expectNoOverlap([current, overdue]);
    });
  }
});

test('Preferences apply Large and Serif at once and keep them after reload and a new sign-in', async ({
  page,
  browser,
}) => {
  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/settings/preferences`);
  await expect(page.locator('#font-preview-caption')).toHaveText(
    'Preview · Medium'
  );
  const before = await bodyFontSize(page);
  expect((await look(page)).family).not.toContain('Georgia');

  await page.getByRole('radio', { name: 'Large', exact: true }).check();
  await page.getByLabel('Font', { exact: true }).selectOption('serif');

  // Applied across the page before anything is saved.
  await expect(page.locator('#font-preview-caption')).toHaveText(
    'Preview · Large'
  );
  await expect
    .poll(() => look(page))
    .toEqual({
      size: '112.5%',
      family: expect.stringContaining('Georgia'),
    });
  expect(await bodyFontSize(page)).toBeGreaterThan(before);
  expect(await settingsRow()).toMatchObject({
    font_size: 'medium',
    font_family: 'system',
  });

  const patched = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === '/api/settings'
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await patched).request().postDataJSON()).toEqual({
    fontSize: 'large',
    fontFamily: 'serif',
  });
  await expect(
    page.getByRole('status').filter({ hasText: 'Preferences saved.' })
  ).toBeVisible();
  expect(await settingsRow()).toMatchObject({
    font_size: 'large',
    font_family: 'serif',
  });

  await page.reload();
  await expect
    .poll(() => look(page))
    .toEqual({
      size: '112.5%',
      family: expect.stringContaining('Georgia'),
    });
  await expect(page.locator('#font-preview-caption')).toHaveText(
    'Preview · Large'
  );

  // A fresh browser has no cached look: the saved one comes from the server after sign-in.
  const fresh = await browser.newContext();
  try {
    const other = await fresh.newPage();
    await logIn(other, harvey.email, harvey.password);
    await expect
      .poll(() => look(other))
      .toEqual({
        size: '112.5%',
        family: expect.stringContaining('Georgia'),
      });
    await other.goto(`${baseUrl}/settings/preferences`);
    await expect(
      other.locator('input[name="font-size"][value="large"]')
    ).toBeChecked();
    await expect(other.getByLabel('Font', { exact: true })).toHaveValue(
      'serif'
    );
  } finally {
    await fresh.close();
  }

  // Preferences are per user: Alex keeps the default size and font.
  const alexUserId = await userIdFor(alex);
  const alexRows = await serviceRoleRows<
    Pick<SettingsRow, 'font_size' | 'font_family'>
  >(
    'tbl_user_setting',
    new URLSearchParams({
      select: 'font_size,font_family',
      user_id: `eq.${alexUserId}`,
    })
  );
  expect(alexRows).toEqual([{ font_size: 'medium', font_family: 'system' }]);
  const alexContext = await browser.newContext();
  try {
    const alexPage = await alexContext.newPage();
    await logIn(alexPage, alex.email, alex.password);
    await alexPage.goto(`${baseUrl}/settings/preferences`);
    await expect(alexPage.locator('#font-preview-caption')).toHaveText(
      'Preview · Medium'
    );
    await expect(alexPage.getByLabel('Font', { exact: true })).toHaveValue(
      'system'
    );
    const alexLook = await look(alexPage);
    expect(alexLook.size).not.toBe('112.5%');
    expect(alexLook.family).not.toContain('Georgia');
  } finally {
    await alexContext.close();
  }
});

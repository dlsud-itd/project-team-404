import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProfileSettings } from '../../../auth/profile/profile-settings/profile-settings';
import { SETTINGS_ROUTES } from '../../settings.routes';
import { SETTINGS_TABS, SettingsLayout } from './settings-layout';

@Component({ template: '<p class="page">tab page</p>' })
class Blank {}

describe('SettingsLayout', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  const tabs = () => [...document.querySelectorAll<HTMLAnchorElement>('nav.tabs a.tab')];
  const picker = () => document.querySelector<HTMLSelectElement>('.picker select')!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'settings',
            component: SettingsLayout,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'profile' },
              ...SETTINGS_TABS.map((tab) => ({ path: tab.path, component: Blank })),
            ],
          },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  it('shows the five side tabs in order, linking to each settings page', async () => {
    await harness.navigateByUrl('/settings/profile');

    expect(tabs().map((tab) => tab.textContent?.trim())).toEqual([
      'Profile',
      'Preferences',
      'Config',
      'Labels',
      'Priorities',
    ]);
    expect(tabs().map((tab) => tab.getAttribute('href'))).toEqual([
      '/settings/profile',
      '/settings/preferences',
      '/settings/config',
      '/settings/labels',
      '/settings/priorities',
    ]);
    expect(document.querySelector('nav.tabs')?.getAttribute('aria-label')).toBe(
      'Settings sections',
    );
    expect(document.querySelector('app-settings-layout .content .page')?.textContent).toBe(
      'tab page',
    );
  });

  it('marks the open tab as the current page', async () => {
    await harness.navigateByUrl('/settings/labels');

    const current = tabs().filter((tab) => tab.getAttribute('aria-current') === 'page');
    expect(current.map((tab) => tab.textContent?.trim())).toEqual(['Labels']);
    expect(current[0].classList).toContain('active');
  });

  it('offers the same tabs as a select for small screens, following the URL', async () => {
    await harness.navigateByUrl('/settings/priorities');

    const select = picker();
    expect([...select.options].map((option) => option.textContent?.trim())).toEqual(
      SETTINGS_TABS.map((tab) => tab.label),
    );
    expect(select.value).toBe('priorities');
    expect(document.querySelector('.picker .visually-hidden')?.textContent).toBe(
      'Settings section',
    );
  });

  it('opens the page picked in the select', async () => {
    await harness.navigateByUrl('/settings/profile');

    const select = picker();
    select.value = 'labels';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).toBe('/settings/labels');
    expect(picker().value).toBe('labels');
  });

  it('opens Profile for /settings', async () => {
    await harness.navigateByUrl('/settings');
    expect(router.url).toBe('/settings/profile');
    expect(picker().value).toBe('profile');
  });
});

describe('SETTINGS_ROUTES', () => {
  it('nests every tab under the layout, keeping /settings/profile for the profile page', () => {
    const [layout] = SETTINGS_ROUTES;
    expect(layout.component).toBe(SettingsLayout);
    const children = layout.children as Route[];
    expect(children.map((route) => route.path)).toEqual([
      '',
      'profile',
      'preferences',
      'config',
      'labels',
      'priorities',
    ]);
    expect(children[0].redirectTo).toBe('profile');
    expect(children.find((route) => route.path === 'profile')?.title).toBe(
      'Profile · HabitTracker',
    );
  });

  it('loads the existing profile page for the Profile tab', async () => {
    const profile = (SETTINGS_ROUTES[0].children as Route[]).find((r) => r.path === 'profile')!;
    const component = await (profile.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(ProfileSettings);
  });
});

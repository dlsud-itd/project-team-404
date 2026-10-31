import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { PROJECTS_ROUTES } from '../projects/projects.routes';
import { Home } from './home';

const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;
const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;

@Component({ template: '' })
class Blank {}

describe('Home tabs', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) =>
    page().querySelector(selector) as T | null;
  const tab = (id: string) => el<HTMLButtonElement>(`#tab-${id}`)!;
  const panelId = () => el('[role="tabpanel"]')?.id;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'home', component: Home },
          { path: 'projects/:projectId/tasks', component: Blank },
          { path: 'settings/profile', component: Blank },
          { path: 'projects', children: PROJECTS_ROUTES },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('opens on the dashboard with its tab selected', async () => {
    await harness.navigateByUrl('/home');

    expect(panelId()).toBe('panel-dashboard');
    expect(tab('dashboard').getAttribute('aria-selected')).toBe('true');
    expect(tab('tasks').getAttribute('aria-selected')).toBe('false');
    expect(tab('dashboard').tabIndex).toBe(0);
    expect(tab('projects').tabIndex).toBe(-1);
    // Nothing slides on first load.
    expect(el('[role="tabpanel"]')?.hasAttribute('data-slide')).toBe(false);
  });

  it('swaps the content in place and keeps the tab in the URL', async () => {
    await harness.navigateByUrl('/home');
    const home = harness.routeDebugElement?.componentInstance;

    tab('tasks').click();
    await settle();

    expect(router.url).toBe('/home?tab=tasks');
    expect(panelId()).toBe('panel-tasks');
    expect(el('#panel-tasks app-all-tasks')).toBeTruthy();
    expect(el('[role="tabpanel"]')?.getAttribute('data-slide')).toBe('right');
    // Same component instance: the page was not reloaded.
    expect(harness.routeDebugElement?.componentInstance).toBe(home);
  });

  it('slides in from the left when going back to an earlier tab', async () => {
    await harness.navigateByUrl('/home?tab=tasks');

    tab('dashboard').click();
    await settle();

    expect(router.url).toBe('/home');
    expect(panelId()).toBe('panel-dashboard');
    expect(el('[role="tabpanel"]')?.getAttribute('data-slide')).toBe('left');
  });

  it('shows the projects list in the Projects tab', async () => {
    await harness.navigateByUrl('/home');

    tab('projects').click();
    await settle();

    expect(panelId()).toBe('panel-projects');
    http.expectOne(PROJECTS_URL).flush([]);
    harness.detectChanges();
    expect(el('#panel-projects h1')?.textContent).toContain('Projects');
  });

  it('moves the pill with the selected tab', async () => {
    await harness.navigateByUrl('/home?tab=projects');
    http.expectOne(PROJECTS_URL).flush([]);

    expect(el('[role="tablist"]')?.style.getPropertyValue('--tab-index')).toBe('2');
  });

  it('moves between tabs with the arrow keys', async () => {
    await harness.navigateByUrl('/home');

    el('[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    await settle();

    expect(router.url).toBe('/home?tab=projects');
    http.expectOne(PROJECTS_URL).flush([]);

    el('[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    await settle();
    expect(router.url).toBe('/home');
  });

  describe('"+ New Task" popup', () => {
    const INBOX = {
      id: 1,
      name: 'Inbox',
      description: null,
      color: null,
      isInbox: true,
      isFavorite: false,
      isArchived: false,
      sortOrder: 0,
    };

    async function openPopup(): Promise<void> {
      el<HTMLButtonElement>('button.new-task')!.click();
      await settle();
      http.expectOne(PROJECTS_URL).flush([INBOX]);
      await settle();
    }

    it('opens the real form over the current tab, with the Inbox picked', async () => {
      await harness.navigateByUrl('/home');

      await openPopup();

      expect(router.url).toBe('/home');
      expect(el('header.topbar')).toBeTruthy();
      expect(el('[role="dialog"] app-recurrence-picker')).toBeTruthy();
      expect(el<HTMLSelectElement>('#task-project')!.selectedOptions[0].textContent).toContain(
        'Inbox',
      );
    });

    it("goes to the task's project after adding, so the task can be seen", async () => {
      await harness.navigateByUrl('/home');
      await openPopup();

      const title = el<HTMLInputElement>('#task-title')!;
      title.value = 'Study';
      title.dispatchEvent(new Event('input'));
      el('[role="dialog"] form')!.dispatchEvent(new Event('submit'));
      http.expectOne(TASKS_URL).flush({
        id: 7,
        projectId: 1,
        title: 'Study',
        description: null,
        priority: 'low',
        scheduledDate: null,
        dueDate: null,
        deadline: null,
        recurrence: 'none',
        isDone: false,
        doneAt: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        labels: [],
      });
      await settle();

      expect(router.url).toBe('/projects/1/tasks');
    });
  });

  it('sends the old /projects address to the Projects tab', async () => {
    await harness.navigateByUrl('/projects');
    http.expectOne(PROJECTS_URL).flush([]);

    expect(router.url).toBe('/home?tab=projects');
    expect(panelId()).toBe('panel-projects');
  });

  describe('new project popup', () => {
    const newProject = () => el<HTMLButtonElement>('.title-row button.new')!;

    it('opens over the Projects tab, keeping the top bar and the URL', async () => {
      await harness.navigateByUrl('/home?tab=projects');
      http.expectOne(PROJECTS_URL).flush([]);
      harness.detectChanges();

      newProject().click();
      await settle();

      expect(router.url).toBe('/home?tab=projects');
      expect(el('header.topbar')).toBeTruthy();
      expect(el('[role="dialog"]')).toBeTruthy();
      expect(el('#panel-projects app-projects-page')).toBeTruthy();
    });

    it('opens from the Organize view too, and stays there', async () => {
      await harness.navigateByUrl('/home?tab=projects&view=organize');
      http.expectOne(PROJECTS_URL).flush([]);
      harness.detectChanges();

      newProject().click();
      await settle();

      expect(router.url).toBe('/home?tab=projects&view=organize');
      expect(el('[role="dialog"]')).toBeTruthy();
    });

    it('sends the old /projects/new address to the Projects tab', async () => {
      await harness.navigateByUrl('/projects/new');
      http.expectOne(PROJECTS_URL).flush([]);

      expect(router.url).toBe('/home?tab=projects');
      expect(panelId()).toBe('panel-projects');
    });
  });

  describe('organize view', () => {
    const viewLink = (label: string) =>
      [...page().querySelectorAll<HTMLAnchorElement>('nav[aria-label="Project views"] a')].find(
        (a) => a.textContent?.trim() === label,
      )!;

    async function open(url = '/home?tab=projects&view=organize'): Promise<void> {
      await harness.navigateByUrl(url);
      http.expectOne(PROJECTS_URL).flush([]);
      harness.detectChanges();
    }

    it('keeps the top bar when Organize is clicked', async () => {
      await open('/home?tab=projects');
      const home = harness.routeDebugElement?.componentInstance;

      viewLink('Organize').click();
      await settle();
      http.expectOne(PROJECTS_URL).flush([]);
      harness.detectChanges();

      expect(router.url).toBe('/home?tab=projects&view=organize');
      expect(el('header.topbar')).toBeTruthy();
      expect(el('#panel-projects app-project-switcher')).toBeTruthy();
      expect(el('#panel-projects app-projects-page')).toBeNull();
      expect(tab('projects').getAttribute('aria-selected')).toBe('true');
      expect(harness.routeDebugElement?.componentInstance).toBe(home);
    });

    it('marks only Organize as the current view', async () => {
      await open();

      expect(viewLink('Organize').getAttribute('aria-current')).toBe('page');
      expect(viewLink('All projects').hasAttribute('aria-current')).toBe(false);
    });

    it('goes back to the list with All projects', async () => {
      await open();

      viewLink('All projects').click();
      await settle();
      http.expectOne(PROJECTS_URL).flush([]);
      harness.detectChanges();

      expect(router.url).toBe('/home?tab=projects');
      expect(el('#panel-projects app-projects-page')).toBeTruthy();
      expect(viewLink('All projects').getAttribute('aria-current')).toBe('page');
    });

    it('sends the old /projects/organize address to the same view', async () => {
      await open('/projects/organize');

      expect(router.url).toBe('/home?tab=projects&view=organize');
      expect(el('#panel-projects app-project-switcher')).toBeTruthy();
    });

    it('forgets the view on leaving the Projects tab', async () => {
      await open();

      tab('tasks').click();
      await settle();

      expect(router.url).toBe('/home?tab=tasks');
    });
  });

  it('falls back to the dashboard for an unknown tab', async () => {
    await harness.navigateByUrl('/home?tab=nope');

    expect(panelId()).toBe('panel-dashboard');
  });
});

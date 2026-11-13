import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../auth/session/session.service';
import { clearSettingsCache, seedSettings } from '../../settings/testing/settings-cache';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import type { ApiProject } from '../../projects/shared/types/project.types';
import { asApiTask } from '../../tasks/shared/testing/api-task';
import type { Task } from '../../tasks/shared/types/task.types';
import { DASHBOARD_NOW } from '../shared/services/dashboard.service';
import { OverdueTasks } from './overdue-tasks';

const URL = `${environment.apiBaseUrl}/api/dashboard/overdue-tasks`;
const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;
// Noon on Nov 6 in Manila.
const NOW = new Date('2026-11-06T04:00:00.000Z');

function task(taskId: number, deadline: string, projectId = 10): Task {
  return {
    taskId,
    projectId,
    priorityId: 3,
    title: `Task ${taskId}`,
    description: null,
    scheduledDate: null,
    dueDate: null,
    deadline,
    recurrence: 'none',
    recurrenceDays: [],
    recurrenceEndDate: null,
    completedAt: null,
    sortOrder: 0,
    isRecurring: false,
    isArchived: false,
    labels: [],
  };
}

function project(id: number, color: string | null): ApiProject {
  return {
    id,
    name: `Project ${id}`,
    description: null,
    color,
    isInbox: false,
    isFavorite: false,
    isArchived: false,
    sortOrder: id,
  };
}

describe('OverdueTasks', () => {
  let fixture: ComponentFixture<OverdueTasks>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(el().querySelectorAll('.task'));
  const text = (node: Element | null | undefined) => node?.textContent?.trim();

  function create(): void {
    fixture = TestBed.createComponent(OverdueTasks);
    fixture.detectChanges();
  }

  function respond(tasks: Task[]): void {
    http.expectOne(URL).flush({ tasks: tasks.map(asApiTask) });
    fixture.detectChanges();
  }

  function respondProjects(projects: ApiProject[] = []): void {
    http.expectOne(`${PROJECTS_URL}?isArchived=false`).flush(projects);
    http.expectOne(`${PROJECTS_URL}?isArchived=true`).flush([]);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DASHBOARD_NOW, useValue: () => NOW },
        {
          provide: SessionService,
          useValue: { currentUser: signal({ username: 'james', timezone: 'Asia/Manila' }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    clearSettingsCache();
  });

  it('shows a loading message until the tasks arrive', () => {
    create();
    respondProjects();
    expect(text(el().querySelector('[role="status"]'))).toContain('Loading');
    respond([]);
    expect(el().querySelector('[role="status"]')).toBeNull();
  });

  it('lists overdue tasks in the server order with their date and lateness', () => {
    create();
    respondProjects();
    respond([task(1, '2026-10-31T15:59:59.999Z'), task(2, '2026-11-05T15:59:59.999Z')]);

    expect(rows().map((row) => text(row.querySelector('.title')))).toEqual(['Task 1', 'Task 2']);
    expect(rows().map((row) => text(row.querySelector('.due')))).toEqual(['Oct 31', 'Nov 5']);
    expect(rows().map((row) => text(row.querySelector('.badge')))).toEqual([
      '6 days overdue',
      '1 day overdue',
    ]);
  });

  it('gives the heading a count for screen readers', () => {
    create();
    respondProjects();
    respond([task(1, '2026-11-05T15:59:59.999Z')]);

    expect(text(el().querySelector('h2'))).toBe('Overdue , 1 overdue task');
    expect(el().querySelector('section')?.getAttribute('aria-labelledby')).toBe('overdue-heading');
  });

  it('shows the empty state when nothing is overdue', () => {
    create();
    respondProjects();
    respond([]);

    expect(rows()).toHaveLength(0);
    expect(text(el().querySelector('.empty'))).toBe('Nothing here');
  });

  it('links tasks to their edit page, unless their project is gone', () => {
    create();
    respondProjects();
    respond([task(1, '2026-11-05T15:59:59.999Z', 10), task(2, '2026-11-05T15:59:59.999Z', 0)]);

    const [linked, orphan] = rows();
    expect(linked.querySelector('a.title')?.getAttribute('href')).toBe('/projects/10/tasks/1/edit');
    expect(orphan.querySelector('a.title')).toBeNull();
    expect(text(orphan.querySelector('span.title'))).toBe('Task 2');
  });

  it('colors each dot with its project color, grey when unknown', () => {
    create();
    respondProjects([project(10, '#10b981')]);
    respond([task(1, '2026-11-05T15:59:59.999Z', 10), task(2, '2026-11-05T15:59:59.999Z', 99)]);

    const dots = rows().map((row) => (row.querySelector('.dot') as HTMLElement).style.background);
    expect(dots).toEqual(['rgb(16, 185, 129)', 'rgb(187, 187, 187)']);
  });

  it('keeps working with grey dots when projects fail to load', () => {
    create();
    http
      .expectOne(`${PROJECTS_URL}?isArchived=false`)
      .flush('down', { status: 500, statusText: 'Server Error' });
    expect(http.expectOne(`${PROJECTS_URL}?isArchived=true`).cancelled).toBe(true);
    respond([task(1, '2026-11-05T15:59:59.999Z')]);

    expect(rows()).toHaveLength(1);
    expect((rows()[0].querySelector('.dot') as HTMLElement).style.background).toBe(
      'rgb(187, 187, 187)',
    );
  });

  it('does not refetch projects that are already loaded', () => {
    TestBed.inject(ProjectsStore).setProjects([]);
    create();
    respond([]);
    http.expectNone(PROJECTS_URL);
  });

  it('shows an error and loads again on retry', () => {
    create();
    respondProjects();
    http.expectOne(URL).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text(el().querySelector('[role="alert"] p'))).toBe(
      "We couldn't load your tasks. Please try again.",
    );

    (el().querySelector('.retry') as HTMLButtonElement).click();
    fixture.detectChanges();
    respond([task(1, '2026-11-05T15:59:59.999Z')]);

    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(rows()).toHaveLength(1);
  });

  it('tells the user when their session has ended', () => {
    create();
    respondProjects();
    http.expectOne(URL).flush('', { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(text(el().querySelector('[role="alert"] p'))).toBe(
      'Your session has ended. Please log in again.',
    );
  });

  it('shows at most the saved number of tasks, oldest first, with View all for the rest', () => {
    seedSettings({ dashboardTaskLimit: 2 });
    create();
    respond([
      task(1, '2026-11-01T15:59:59.999Z'),
      task(2, '2026-11-02T15:59:59.999Z'),
      task(3, '2026-11-03T15:59:59.999Z'),
    ]);
    respondProjects();

    expect(rows().map((row) => text(row.querySelector('.title')))).toEqual(['Task 1', 'Task 2']);
    expect(text(el().querySelector('h2 .visually-hidden'))).toBe(', 3 overdue tasks');
    const viewAll = el().querySelector<HTMLAnchorElement>('a.view-all')!;
    expect(text(viewAll)).toBe('View all (3)');
    expect(viewAll.getAttribute('href')).toBe('/home?tab=tasks');
    expect(viewAll.getAttribute('aria-label')).toBe('View all 3 overdue tasks');
  });

  it('counts the tasks a Sprint 5 server left out of its capped list', () => {
    seedSettings({ dashboardTaskLimit: 1 });
    create();
    http
      .expectOne(URL)
      .flush({ tasks: [asApiTask(task(1, '2026-11-01T15:59:59.999Z'))], total: 4 });
    fixture.detectChanges();
    respondProjects();

    expect(rows()).toHaveLength(1);
    expect(text(el().querySelector('a.view-all'))).toBe('View all (4)');
  });

  it('keeps the list scrollable within the card and shows no View all when it fits', () => {
    create();
    respond([task(1, '2026-11-01T15:59:59.999Z')]);
    respondProjects();

    expect(el().querySelector('a.view-all')).toBeNull();
    const list = el().querySelector<HTMLElement>('ul.list')!;
    expect(list.getAttribute('aria-label')).toBe('Overdue tasks');
    expect(getComputedStyle(list).overflowY).toBe('auto');
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/services/toast.service';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import type { ApiArchiveResponse } from '../../types/archive.types';
import { ArchivePage } from './archive-page';

const API = `${environment.apiBaseUrl}/api`;
const NOW = new Date().toISOString();

function body(overrides: Partial<ApiArchiveResponse> = {}): ApiArchiveResponse {
  return {
    tasks: {
      items: [{ id: 9, title: 'Buy milk', projectId: 5, archivedAt: NOW }],
      total: 1,
    },
    projects: { items: [{ id: 7, name: 'Old', color: '#ff0000', archivedAt: NOW }], total: 1 },
    labels: {
      items: [{ id: 3, name: 'Work', color: null, taskCount: 2, archivedAt: NOW }],
      total: 1,
    },
    nextCursor: null,
    ...overrides,
  };
}

const empty = { items: [], total: 0 };

describe('ArchivePage', () => {
  let fixture: ComponentFixture<ArchivePage>;
  let http: HttpTestingController;
  let toasts: ToastService;
  let page: HTMLElement;

  const all = (selector: string) => [...page.querySelectorAll<HTMLElement>(selector)];
  const el = (selector: string) => page.querySelector<HTMLElement>(selector);
  const rows = () => all('.row .title').map((title) => title.textContent?.trim());
  const tabs = () =>
    all('[role="tab"]').map((tab) =>
      [...tab.querySelectorAll('span')].map((part) => part.textContent?.trim()).join(' '),
    );
  const button = (label: string) =>
    page.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  function expectList(type = 'all', cursor?: string) {
    const req = http.expectOne(
      (r) =>
        r.url === `${API}/archive` &&
        r.params.get('type') === type &&
        r.params.get('cursor') === (cursor ?? null) &&
        r.params.get('limit') === '20',
    );
    return req;
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function create(tab?: string): Promise<void> {
    if (tab) await TestBed.inject(Router).navigate([], { queryParams: { tab } });
    fixture = TestBed.createComponent(ArchivePage);
    page = fixture.nativeElement;
    await settle();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchivePage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    // The page fetches projects for task rows unless they are already loaded.
    TestBed.inject(ProjectsStore).setProjects([
      {
        projectId: 5,
        name: 'Home',
        description: null,
        color: '#2563EB',
        isInbox: false,
        isFavorite: false,
        isArchived: false,
        sortOrder: 1,
      },
    ]);
  });

  afterEach(() => http.verify());

  it('shows loading, then every archived item with its project, color and date', async () => {
    await create();
    expect(el('[role="status"]')?.textContent).toContain('Loading');

    expectList().flush(body());
    await settle();

    expect(rows()).toEqual(['Buy milk', 'Old', 'Work']);
    const task = el('.row[data-kind="task"]')!;
    expect(task.querySelector('.chip')?.textContent?.trim()).toBe('Home');
    expect(task.querySelector('.when')?.textContent?.trim()).toBe('Archived just now');
    expect(el('.row[data-kind="label"]')?.textContent).toContain('2 tasks');
  });

  it('shows the count on every tab', async () => {
    await create();
    expectList().flush(body());
    await settle();
    expect(tabs()).toEqual(['All 3', 'Tasks 1', 'Projects 1', 'Labels 1', 'Priorities 0']);
    expect(el('[role="tab"][aria-selected="true"]')?.textContent).toContain('All');
  });

  it('opens on the tab in the URL and fetches the other counts once', async () => {
    await create('labels');
    expectList('labels').flush(body({ tasks: empty, projects: empty }));
    http
      .expectOne((r) => r.url === `${API}/archive` && r.params.get('limit') === '1')
      .flush(body({ tasks: { items: [], total: 4 }, labels: { items: [], total: 1 } }));
    await settle();

    expect(rows()).toEqual(['Work']);
    expect(tabs()).toEqual(['All 6', 'Tasks 4', 'Projects 1', 'Labels 1', 'Priorities 0']);
  });

  it('moves between tabs with the arrow keys', async () => {
    await create();
    expectList().flush(body());
    await settle();

    const tablist = el('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle();

    expect(TestBed.inject(ActivatedRoute).snapshot.queryParamMap.get('tab')).toBe('tasks');
    expectList('tasks').flush(body({ projects: empty, labels: empty }));
    await settle();
    expect(rows()).toEqual(['Buy milk']);
    expect(document.activeElement?.id).toBe('archive-tab-tasks');
  });

  it('shows an empty state for the tab', async () => {
    await create();
    expectList().flush(body({ tasks: empty, projects: empty, labels: empty }));
    await settle();
    expect(el('.empty-title')?.textContent).toBe('Nothing archived yet');
  });

  it('shows an error with a way to retry', async () => {
    await create();
    expectList().flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(el('[role="alert"]')?.textContent).toContain("Couldn't load your archive.");
    (el('[role="alert"] button') as HTMLButtonElement).click();
    await settle();
    expectList().flush(body());
    await settle();
    expect(rows()).toEqual(['Buy milk', 'Old', 'Work']);
  });

  it('restores at once and confirms with a toast', async () => {
    await create();
    expectList().flush(body());
    await settle();

    button('Restore task Buy milk')!.click();
    await settle();
    expect(rows()).toEqual(['Old', 'Work']);
    expect(tabs()).toEqual(['All 2', 'Tasks 0', 'Projects 1', 'Labels 1', 'Priorities 0']);

    const req = http.expectOne(`${API}/tasks/9/archive`);
    expect(req.request.body).toEqual({ isArchived: false });
    req.flush({ taskId: 9, isArchived: false, archivedAt: null });
    expect(toasts.toasts().at(-1)?.message).toBe('Task “Buy milk” restored');
  });

  it('puts the row back and shows an error toast when restoring fails', async () => {
    await create();
    expectList().flush(body());
    await settle();

    button('Restore label Work')!.click();
    await settle();
    http
      .expectOne(`${API}/labels/3/archive`)
      .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(rows()).toEqual(['Buy milk', 'Old', 'Work']);
    expect(tabs()).toEqual(['All 3', 'Tasks 1', 'Projects 1', 'Labels 1', 'Priorities 0']);
    const toast = toasts.toasts().at(-1)!;
    expect(toast.kind).toBe('error');
    expect(toast.message).toBe("Couldn't restore label “Work”. Please try again.");
  });

  it('deletes permanently only after confirming', async () => {
    await create();
    expectList().flush(body());
    await settle();

    button('Delete project Old permanently')!.click();
    await settle();
    const dialog = el('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Delete project “Old” permanently?');
    expect(dialog.textContent).toContain('Its tasks will move to your Inbox');

    (dialog.querySelector('.cancel') as HTMLButtonElement).click();
    await settle();
    expect(el('[role="alertdialog"]')).toBeNull();

    button('Delete project Old permanently')!.click();
    await settle();
    (el('[role="alertdialog"] .confirm') as HTMLButtonElement).click();
    await settle();
    const req = http.expectOne(`${API}/projects/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(el('[role="alertdialog"]')).toBeNull();
    expect(rows()).toEqual(['Buy milk', 'Work']);
    expect(toasts.toasts().at(-1)?.message).toBe('Project “Old” deleted');
  });

  it('keeps the dialog open with the error when deleting fails', async () => {
    await create();
    expectList().flush(body());
    await settle();

    button('Delete task Buy milk permanently')!.click();
    await settle();
    (el('[role="alertdialog"] .confirm') as HTMLButtonElement).click();
    await settle();
    http
      .expectOne(`${API}/tasks/9`)
      .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(el('[role="alertdialog"] .error')?.textContent).toContain("Couldn't delete task");
    expect(rows()).toEqual(['Buy milk', 'Old', 'Work']);
  });

  it('loads more with the cursor and appends the next page', async () => {
    await create();
    expectList().flush(body({ nextCursor: 'page-2' }));
    await settle();

    const more = el('.more button') as HTMLButtonElement;
    expect(more.textContent?.trim()).toBe('Load more');
    more.click();
    await settle();
    expect(more.disabled).toBe(true);

    expectList('all', 'page-2').flush(
      body({
        tasks: {
          items: [{ id: 10, title: 'Older task', projectId: 5, archivedAt: NOW }],
          total: 2,
        },
        projects: empty,
        labels: empty,
        nextCursor: null,
      }),
    );
    await settle();

    expect(rows()).toEqual(['Buy milk', 'Old', 'Work', 'Older task']);
    expect(el('.more')).toBeNull();
  });
});

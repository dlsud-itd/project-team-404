import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { TasksStore } from '../../shared/state/tasks.store';
import type { Task } from '../../shared/types/task.types';
import { formatDate } from '../../task-scheduling/utils/date-format.util';
import type { TableSort } from '../types/task-view.types';
import { TableView } from './table-view';

const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;

const base: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 1,
  title: 'Write chapter 1',
  description: null,
  scheduledDate: null,
  dueDate: null,
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};
const CHAPTER: Task = {
  ...base,
  scheduledDate: '2099-03-01',
  dueDate: '2099-03-02',
  labels: [
    { labelId: 4, name: 'School', color: '#2563EB' },
    { labelId: 5, name: 'Writing', color: null },
  ],
};
const LATE: Task = { ...base, taskId: 2, title: 'Late essay', dueDate: '2020-01-10' };
const DONE: Task = { ...base, taskId: 3, title: 'Proposal', completedAt: '2026-10-01T10:00:00Z' };
/** A weekly repeat whose next occurrence is far ahead, so it can't be completed yet. */
const LATER_REPEAT: Task = {
  ...base,
  taskId: 4,
  title: 'Weekly review',
  dueDate: '2099-06-01',
  recurrence: 'weekly',
  recurrenceDays: [1],
  isRecurring: true,
};
const DEFAULT_SORT: TableSort = { orderBy: null, orderDirection: 'asc' };

describe('TableView', () => {
  let fixture: ComponentFixture<TableView>;
  let http: HttpTestingController;
  let router: Router;

  const host = () => fixture.nativeElement as HTMLElement;
  const headers = () => [...host().querySelectorAll<HTMLElement>('thead th')];
  const rows = () => [...host().querySelectorAll<HTMLTableRowElement>('tbody tr')];
  const cells = (row: HTMLTableRowElement) =>
    [...row.children].map((cell) => cell.textContent?.trim().replace(/\s+/g, ' '));
  const header = (label: string) => headers().find((h) => h.textContent?.trim() === label)!;
  const checkbox = (title: string) =>
    host().querySelector<HTMLInputElement>(`input[aria-label$="${title} complete"]`) ??
    host().querySelector<HTMLInputElement>(`input[aria-label$="${title} incomplete"]`)!;

  function render(tasks: Task[], sort: TableSort = DEFAULT_SORT): void {
    TestBed.inject(TasksStore).setTasks(10, tasks);
    fixture.componentRef.setInput('tasks', tasks);
    fixture.componentRef.setInput('sort', sort);
    fixture.detectChanges();
    // Streak badges ask for their streaks; these tests don't look at them.
    http.match((req) => req.url.endsWith('/streak')).forEach((req) => req.flush({}));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    TestBed.inject(ProjectsStore).setProjects([
      {
        projectId: 10,
        name: 'Capstone',
        description: null,
        color: null,
        isInbox: false,
        isFavorite: false,
        isArchived: false,
        sortOrder: 0,
      },
    ]);
    fixture = TestBed.createComponent(TableView);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('has the columns in order, with sort buttons only where the API can sort', () => {
    render([CHAPTER]);

    expect(headers().map((h) => h.textContent?.trim())).toEqual([
      'Title',
      'Project',
      'Priority',
      'Labels',
      'Start date',
      'End date',
      'Recurrence',
      'Streak',
      'Status',
    ]);
    expect(headers().map((h) => !!h.querySelector('button.sort'))).toEqual([
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it('shows one row per task, in the order given', () => {
    render([CHAPTER, LATE, DONE]);

    expect(rows()).toHaveLength(3);
    expect(cells(rows()[0])).toEqual([
      'Write chapter 1',
      'Capstone',
      'High',
      'SchoolWriting',
      formatDate('2099-03-01'),
      formatDate('2099-03-02'),
      '—',
      '—',
      'To do',
    ]);
    expect(
      [...rows()[0].querySelectorAll('.col-labels li')].map((li) => li.textContent?.trim()),
    ).toEqual(['School', 'Writing']);
    expect(cells(rows()[1]).at(-1)).toBe('Overdue');
    expect(rows()[1].querySelector('.col-due')!.classList).toContain('overdue');
    expect(cells(rows()[2]).at(-1)).toBe('Done');
    expect(rows()[2].classList).toContain('done');
  });

  it('describes a repeat and shows its streak', () => {
    render([LATER_REPEAT]);

    const row = rows()[0];
    expect(row.querySelector('.col-recurrence')?.textContent?.trim()).toBe('Every week on Mon');
    expect(row.querySelector('.col-streak app-streak-badge')).not.toBeNull();
  });

  describe('sorting', () => {
    it('marks the sorted column and emits the next sort when a header is clicked', () => {
      const emitted: TableSort[] = [];
      fixture.componentInstance.sortChange.subscribe((sort) => emitted.push(sort));
      render([CHAPTER], { orderBy: 'dueDate', orderDirection: 'asc' });

      expect(header('End date').getAttribute('aria-sort')).toBe('ascending');
      expect(header('Title').getAttribute('aria-sort')).toBe('none');
      expect(header('Labels').hasAttribute('aria-sort')).toBe(false);

      header('End date').querySelector('button')!.click();
      header('Title').querySelector('button')!.click();

      expect(emitted).toEqual([
        { orderBy: 'dueDate', orderDirection: 'desc' },
        { orderBy: 'title', orderDirection: 'asc' },
      ]);
    });

    it('goes back to the default order from a descending column', () => {
      const emitted: TableSort[] = [];
      fixture.componentInstance.sortChange.subscribe((sort) => emitted.push(sort));
      render([CHAPTER], { orderBy: 'priority', orderDirection: 'desc' });

      expect(header('Priority').getAttribute('aria-sort')).toBe('descending');
      const button = header('Priority').querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBe('Sort by Priority: back to default order');

      button.click();

      expect(emitted).toEqual([DEFAULT_SORT]);
    });
  });

  describe('opening a task', () => {
    it('opens the task when its row is clicked', () => {
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      render([CHAPTER]);

      rows()[0].querySelector<HTMLElement>('.col-project')!.click();

      expect(navigate).toHaveBeenCalledWith(['/projects', 10, 'tasks', 1, 'edit']);
    });

    it('links the title, for keyboard users', () => {
      render([CHAPTER]);

      expect(rows()[0].querySelector('a.title')?.getAttribute('href')).toBe(
        '/projects/10/tasks/1/edit',
      );
    });

    it('does not open the task when its checkbox is clicked', () => {
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      render([CHAPTER]);

      checkbox('Write chapter 1').click();
      http.expectOne(`${TASKS_URL}/1`).flush({ id: 1, isDone: true, doneAt: null, position: 0 });

      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('completing', () => {
    it('marks a task complete and shows it done once saved', () => {
      render([CHAPTER]);

      checkbox('Write chapter 1').click();
      fixture.detectChanges();
      const req = http.expectOne(`${TASKS_URL}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toMatchObject({ isDone: true });
      expect(checkbox('Write chapter 1').disabled).toBe(true);

      req.flush({ id: 1, isDone: true, doneAt: '2026-11-27T00:00:00Z', position: 0 });
      // The page passes the store's tasks back in; here the test does it.
      fixture.componentRef.setInput('tasks', TestBed.inject(TasksStore).tasks());
      fixture.detectChanges();

      expect(checkbox('Write chapter 1').checked).toBe(true);
      expect(checkbox('Write chapter 1').getAttribute('aria-label')).toBe(
        'Mark Write chapter 1 incomplete',
      );
      expect(cells(rows()[0]).at(-1)).toBe('Done');
    });

    it('reopens a completed task', () => {
      render([DONE]);

      checkbox('Proposal').click();

      const req = http.expectOne(`${TASKS_URL}/3`);
      expect(req.request.body).toMatchObject({ isDone: false });
      req.flush({ id: 3, isDone: false, doneAt: null, position: 0 });
    });

    it('unticks the box and says why when the save fails', () => {
      render([CHAPTER]);

      checkbox('Write chapter 1').click();
      http
        .expectOne(`${TASKS_URL}/1`)
        .flush({ message: 'Server down' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(checkbox('Write chapter 1').checked).toBe(false);
      expect(checkbox('Write chapter 1').disabled).toBe(false);
      expect(host().querySelector('[role="alert"]')?.textContent?.trim()).toBeTruthy();
    });

    it('disables the box for a repeat that is not due yet', () => {
      render([LATER_REPEAT]);

      const box = checkbox('Weekly review');
      expect(box.disabled).toBe(true);
      const note = rows()[0].querySelector('.not-due')!;
      expect(note.textContent?.trim()).toMatch(/^Available on Jun 1$/);
      expect(box.getAttribute('aria-describedby')).toBe(note.id);
    });
  });

  it('scrolls sideways inside a focusable region rather than widening the page', () => {
    render([CHAPTER]);

    const region = host().querySelector<HTMLElement>('.scroller')!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.querySelector('table')).not.toBeNull();
  });
});

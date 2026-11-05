import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { DASHBOARD_PROJECTS, DASHBOARD_TASKS, task } from '../testing/dashboard-fixture';
import { DashboardStore } from '../dashboard.store';
import { asApiTask } from '../../tasks/shared/testing/api-task';
import { AllTasks } from './all-tasks';

const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;

describe('AllTasks', () => {
  let fixture: ComponentFixture<AllTasks>;
  let store: DashboardStore;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const titles = () =>
    [...page.querySelectorAll('.task .title')].map((node) => node.textContent?.trim());
  const heading = () => page.querySelector('h2')?.textContent?.trim();
  const dueInput = () => page.querySelector<HTMLInputElement>('input[type="date"]');

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }

  function type(selector: string, value: string): void {
    const input = el<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    render();
  }

  function submit(): void {
    el<HTMLFormElement>('form.composer')!.dispatchEvent(new Event('submit'));
    render();
  }

  function compose(): void {
    fixture.componentRef.setInput('composing', true);
    render();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));

    await TestBed.configureTestingModule({
      imports: [AllTasks],
      providers: [DashboardStore, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    store = TestBed.inject(DashboardStore);
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AllTasks);
    page = fixture.nativeElement;
    render();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('lists live tasks with project, priority and due date', () => {
    expect(titles()).toHaveLength(9);
    expect(titles().at(-1)).toBe('Gym session');
    const first = el('.task')!;
    expect(first.querySelector('.project')?.textContent?.trim()).toBe('School');
    expect(first.querySelector('.priority')?.textContent?.trim()).toBe('high');
    expect(first.querySelector('.due')?.classList).toContain('overdue');
  });

  it('shows the form only while composing, with today as the default due date', () => {
    expect(el('form.composer')).toBeNull();
    compose();

    expect(el<HTMLInputElement>('input[aria-label="Due date"]')!.value).toBe('2026-10-30');
    expect(el<HTMLSelectElement>('select[aria-label="Priority"]')!.value).toBe('medium');
  });

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['over 200 characters', 'x'.repeat(201)],
  ])('rejects a title that is %s', (_, title) => {
    compose();
    type('input[aria-label="Task title"]', title);
    submit();

    expect(store.tasks()).toHaveLength(9);
    expect(el('input[aria-label="Task title"]')!.getAttribute('aria-invalid')).toBe('true');
    http.expectNone(TASKS_URL);
  });

  it('creates a task through the API and adds the response to the dashboard', () => {
    compose();
    type('input[aria-label="Task title"]', '  Write essay  ');
    submit();

    const request = http.expectOne(TASKS_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      priority: 'medium',
      title: 'Write essay',
      description: null,
      dueDate: '2026-10-30',
      deadline: null,
      recurrence: 'none',
      recurrenceDays: [],
      recurrenceEndDate: null,
    });
    request.flush(asApiTask(task(10, 'Write essay', 4, 2, '2026-10-30')));
    render();

    expect(store.tasks().at(-1)).toMatchObject({
      title: 'Write essay',
      projectId: 4,
      priority: 'medium',
      due: '2026-10-30',
    });
    expect(el('form.composer')).toBeNull();
  });

  it('completes and deletes tasks through the API', () => {
    const labReport = [...page.querySelectorAll<HTMLElement>('.task')].find((item) =>
      item.textContent?.includes('Submit lab report'),
    )!;
    labReport.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    render();

    const update = http.expectOne(`${TASKS_URL}/1`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toMatchObject({ isDone: true, doneAt: expect.any(String) });
    update.flush({ taskId: 1, message: 'Task updated successfully' });
    render();
    expect(store.tasks().find((item) => item.title === 'Submit lab report')?.done).toBe(true);

    labReport
      .querySelector<HTMLButtonElement>('button[aria-label="Delete Submit lab report"]')!
      .click();
    render();
    const deletion = http.expectOne(`${TASKS_URL}/1`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush({ message: 'Task deleted successfully' });
    render();
    expect(titles()).not.toContain('Submit lab report');
  });

  it('says so when no task matches the filter', () => {
    store.filter.set({ projectId: 999 });
    render();

    expect(el('.empty')?.textContent?.trim()).toBe('No tasks match. Add one with “+ New Task”.');
  });

  it('names the day in the heading and starts a task on that day', () => {
    expect(heading()).toBe('All Tasks');
    store.filter.set({ due: '2026-11-02' });
    fixture.componentInstance.composing.set(true);
    render();

    expect(heading()).toBe('Due Nov 2');
    expect(dueInput()?.value).toBe('2026-11-02');
  });

  it('starts a new task today when no day is picked', () => {
    fixture.componentInstance.composing.set(true);
    render();

    expect(dueInput()?.value).toBe('2026-10-30');
  });
});

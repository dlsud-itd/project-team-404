import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiProject } from '../../projects/testing/helpers/api-project';
import type { Project } from '../../projects/shared/types/project.types';
import { asApiTask } from '../../tasks/shared/testing/api-task';
import type { Task } from '../../tasks/shared/types/task.types';
import { TasksPage } from './tasks-page';

const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;
const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;
const LIST_URL = `${TASKS_URL}?status=all&pageSize=100&page=1`;
const INBOX: Project = {
  projectId: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const DESIGN: Project = {
  projectId: 2,
  name: 'Design',
  description: null,
  color: '#2563EB',
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 1,
};
const TASK: Task = {
  taskId: 10,
  projectId: DESIGN.projectId,
  priorityId: 1,
  title: 'Review actual project work',
  description: null,
  dueDate: '2026-10-02',
  deadline: null,
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};

describe('TasksPage', () => {
  let fixture: ComponentFixture<TasksPage>;
  let http: HttpTestingController;

  const element = <T extends HTMLElement>(selector: string) =>
    fixture.nativeElement.querySelector(selector) as T | null;

  function load(tasks: Task[] = [TASK]): void {
    http.expectOne(PROJECTS_URL).flush([apiProject(INBOX), apiProject(DESIGN)]);
    http.expectOne(LIST_URL).flush(tasks.map(asApiTask));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TasksPage);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads real projects and tasks from their APIs', () => {
    load();

    expect(element('li.task .title')?.textContent).toContain(TASK.title);
    expect(element('li.task .project')?.textContent).toContain('Design');
    expect(element<HTMLElement>('li.task .swatch')?.style.background).toBe('rgb(37, 99, 235)');
    expect(element('li.task .priority')?.textContent).toContain('High');
  });

  it('completes a task through the task update API', () => {
    load();
    const checkbox = element<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const request = http.expectOne(`${TASKS_URL}/${TASK.taskId}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({
      isDone: true,
      doneAt: expect.any(String),
    });
    request.flush({ taskId: TASK.taskId, message: 'Task updated successfully' });
    fixture.detectChanges();

    expect(element<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(element('li.task')?.classList.contains('done')).toBe(true);
  });

  it('creates a task in the selected real project', () => {
    load([]);
    element<HTMLButtonElement>('.new')!.click();
    fixture.detectChanges();

    const title = element<HTMLInputElement>('input[formControlName="title"]')!;
    title.value = 'Prepare prototype';
    title.dispatchEvent(new Event('input'));
    const project = element<HTMLSelectElement>('select[formControlName="projectId"]')!;
    project.selectedIndex = 1;
    project.dispatchEvent(new Event('change'));
    element<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    const created: Task = { ...TASK, taskId: 11, title: 'Prepare prototype' };
    const request = http.expectOne(TASKS_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      projectId: DESIGN.projectId,
      priority: 'low',
      title: 'Prepare prototype',
      description: null,
      dueDate: null,
      deadline: null,
      recurrence: 'none',
      recurrenceDays: [],
      recurrenceEndDate: null,
    });
    request.flush(asApiTask(created));
    fixture.detectChanges();

    expect(element('li.task .title')?.textContent).toContain('Prepare prototype');
  });

  it('rejects a blank task title without calling the API', () => {
    load([]);
    element<HTMLButtonElement>('.new')!.click();
    fixture.detectChanges();

    const title = element<HTMLInputElement>('input[formControlName="title"]')!;
    title.value = '   ';
    title.dispatchEvent(new Event('input'));
    element<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(element('[role="alert"]')?.textContent).toContain('Enter a task title');
    http.expectNone(TASKS_URL);
  });

  it('deletes a task through the confirmation dialog and API', () => {
    load();
    element<HTMLButtonElement>('.delete')!.click();
    fixture.detectChanges();
    element<HTMLButtonElement>('.confirm')!.click();

    const request = http.expectOne(`${TASKS_URL}/${TASK.taskId}`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ message: 'Task deleted successfully' });
    fixture.detectChanges();

    expect(element('li.task')).toBeNull();
  });
});

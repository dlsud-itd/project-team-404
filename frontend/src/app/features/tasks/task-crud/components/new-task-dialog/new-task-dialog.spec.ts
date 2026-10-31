import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { TasksStore } from '../../../shared/state/tasks.store';
import { asApiTask } from '../../../shared/testing/api-task';
import type { Task } from '../../../shared/types/task.types';
import { NewTaskDialog } from './new-task-dialog';

const URL = `${environment.apiBaseUrl}/api/tasks`;
const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;
const STUDY: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 3,
  title: 'Study',
  description: null,
  dueDate: null,
  deadline: null,
  recurrence: 'none',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};

describe('NewTaskDialog', () => {
  let fixture: ComponentFixture<NewTaskDialog>;
  let page: HTMLElement;
  let store: TasksStore;
  let http: HttpTestingController;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T;
  const titleInput = () => el<HTMLInputElement>('#task-title');

  function typeTitle(value: string): void {
    titleInput().value = value;
    titleInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    el('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function pressEscape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTaskDialog],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(TasksStore);
    store.creating.set({ projectId: 10 });
    fixture = TestBed.createComponent(NewTaskDialog);
    page = fixture.nativeElement;
    document.body.appendChild(page);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne(PROJECTS_URL).flush([]);
    fixture.detectChanges();
  });

  afterEach(() => {
    page.remove();
    http.verify();
  });

  it('is a labelled modal dialog holding the form, with Repeat', () => {
    const dialog = el('[role="dialog"]');

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('new-task-title');
    expect(el('#new-task-title').textContent?.trim()).toBe('New task');
    expect(dialog.querySelector('app-recurrence-picker')).toBeTruthy();
  });

  it('shows only the form, without the page link or a page landmark', () => {
    expect(el('.back')).toBeNull();
    expect(el('h1')).toBeNull();
    expect(el('main')).toBeNull();
    expect(el('[role="main"]')).toBeNull();
  });

  it('starts on the title field', () => {
    expect(document.activeElement).toBe(titleInput());
  });

  it('closes with Cancel', () => {
    el<HTMLButtonElement>('button.secondary').click();

    expect(store.creating()).toBeNull();
  });

  it('closes with Escape, wherever the focus is', () => {
    pressEscape();

    expect(store.creating()).toBeNull();
  });

  it('stays open when the backdrop is clicked, so typed text is not lost', () => {
    typeTitle('Study');

    el('.backdrop').click();

    expect(store.creating()).not.toBeNull();
  });

  it('stays open on Escape while saving', () => {
    typeTitle('Study');
    submit();

    pressEscape();

    expect(store.creating()).not.toBeNull();
    http.expectOne(URL).flush(asApiTask(STUDY));
  });

  it('closes after adding and reports the new task', () => {
    let created: Task | undefined;
    fixture.componentInstance.created.subscribe((task) => (created = task));
    typeTitle('Study');
    submit();
    http.expectOne(URL).flush(asApiTask(STUDY));

    expect(store.creating()).toBeNull();
    expect(created?.taskId).toBe(1);
  });

  it('stays open and keeps the input when saving fails', () => {
    typeTitle('Study');
    submit();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(store.creating()).not.toBeNull();
    expect(titleInput().value).toBe('Study');
    expect(el('.form-error').textContent).toContain('Something went wrong.');
  });

  it('clears the open state when it is destroyed, so it cannot reopen by itself', () => {
    fixture.destroy();

    expect(store.creating()).toBeNull();
  });
});

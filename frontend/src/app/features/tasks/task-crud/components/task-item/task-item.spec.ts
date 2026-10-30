import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Task } from '../../../shared/types/task.types';
import { TaskItem, formatDate, formatTime } from './task-item';

const STUDY: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 1,
  title: 'Study ILT Module 4',
  description: 'Read all lessons',
  dueDate: '2026-10-02',
  dueTime: '18:00:00',
  deadline: '2026-10-05',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [{ labelId: 3, name: 'Study', color: '#2563EB' }],
};
const BARE: Task = {
  ...STUDY,
  priorityId: 4,
  description: null,
  dueDate: null,
  dueTime: null,
  deadline: null,
  labels: [],
};

describe('TaskItem', () => {
  let fixture: ComponentFixture<TaskItem>;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';

  function render(task: Task): void {
    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskItem],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(TaskItem);
    page = fixture.nativeElement;
  });

  it('shows the title, description, priority and labels', () => {
    render(STUDY);

    expect(text('.title')).toBe('Study ILT Module 4');
    expect(text('.description')).toBe('Read all lessons');
    expect(text('.priority')).toBe('P1');
    expect(el('.priority')?.getAttribute('aria-label')).toBe('Priority 1');
    expect(text('.label')).toBe('Study');
  });

  it('shows the due date with its time, and the deadline', () => {
    render(STUDY);

    expect(text('.due')).toBe(`Due ${formatDate('2026-10-02')}, 6:00 PM`);
    expect(text('.deadline')).toBe(`Deadline ${formatDate('2026-10-05')}`);
  });

  it('leaves out the parts a task does not have', () => {
    render(BARE);

    expect(el('.description')).toBeNull();
    expect(el('.meta')).toBeNull();
    expect(el('.labels')).toBeNull();
  });

  it('marks completed and repeating tasks', () => {
    render({ ...BARE, completedAt: '2026-10-01T10:00:00Z', isRecurring: true });

    expect(el('.item')?.classList).toContain('done');
    expect(text('.complete')).toBe('Done');
    expect(page.textContent).toContain('Repeats');
  });

  it('links to the edit page of the task', () => {
    render(STUDY);

    expect(el('a.edit')?.getAttribute('href')).toBe('/projects/10/tasks/1/edit');
    expect(el('a.edit')?.getAttribute('aria-label')).toBe('Edit Study ILT Module 4');
  });

  it('asks the parent to delete the task', () => {
    render(STUDY);
    let requested: Task | undefined;
    fixture.componentInstance.deleteRequested.subscribe((task) => (requested = task));

    el<HTMLButtonElement>('button.delete')!.click();

    expect(requested).toEqual(STUDY);
  });
});

describe('formatDate', () => {
  const today = new Date(2026, 9, 30);

  it('shows month and day for this year', () => {
    expect(formatDate('2026-10-02', today)).toBe('Oct 2');
  });

  it('adds the year for another year', () => {
    expect(formatDate('2027-01-15', today)).toBe('Jan 15, 2027');
  });
});

describe('formatTime', () => {
  it('shows a 12-hour time', () => {
    expect(formatTime('18:00:00')).toBe('6:00 PM');
    expect(formatTime('09:05:00')).toBe('9:05 AM');
  });
});

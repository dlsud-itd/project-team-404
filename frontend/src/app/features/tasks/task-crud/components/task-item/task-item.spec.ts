import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../../auth/session/session.service';
import type { Task } from '../../../shared/types/task.types';
import { formatDate } from '../../../task-scheduling/utils/date-format.util';
import { TaskItem } from './task-item';

const STUDY: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 1,
  title: 'Study ILT Module 4',
  description: 'Read all lessons',
  scheduledDate: null,
  dueDate: '2026-10-02',
  // Oct 6 in Asia/Manila (UTC+8), though still Oct 5 in UTC.
  deadline: '2026-10-05T17:00:00.000Z',
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [{ labelId: 3, name: 'Study', color: '#2563EB' }],
};
const BARE: Task = {
  ...STUDY,
  priorityId: 3,
  description: null,
  dueDate: null,
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
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: { currentUser: () => ({ timezone: 'Asia/Manila' }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TaskItem);
    page = fixture.nativeElement;
  });

  it('shows the title, description, priority and labels', () => {
    render(STUDY);

    expect(text('.title')).toBe('Study ILT Module 4');
    expect(text('.description')).toBe('Read all lessons');
    expect(el('.item')?.getAttribute('title')).toBe('Priority: High');
    expect(text('.visually-hidden')).toBe('High priority');
    expect(text('.label')).toBe('Study');
  });

  it("shows the due date, and the deadline on its day in the user's timezone", () => {
    render(STUDY);

    expect(text('.due')).toBe(`Due ${formatDate('2026-10-02')}`);
    expect(text('.deadline')).toBe(`Deadline ${formatDate('2026-10-06')}`);
  });

  it('shows a scheduled date even when the task has no due date or deadline', () => {
    render({ ...BARE, scheduledDate: '2026-10-03' });

    expect(text('.scheduled')).toBe(`Scheduled ${formatDate('2026-10-03')}`);
  });

  it('leaves out the parts a task does not have', () => {
    render(BARE);

    expect(el('.description')).toBeNull();
    // The meta line always names the priority, and holds nothing else here.
    expect(el('.meta')?.children).toHaveLength(1);
    expect(el('.meta .priority-name')).not.toBeNull();
    expect(el('.labels')).toBeNull();
  });

  it('marks completed and repeating tasks', () => {
    render({
      ...BARE,
      completedAt: '2026-10-01T10:00:00Z',
      recurrence: 'weekly',
      recurrenceDays: [],
      recurrenceEndDate: null,
      isRecurring: true,
    });

    expect(el('.item')?.classList).toContain('done');
    expect(text('.complete')).toBe('Done');
    expect(page.textContent).toContain('Every week');
  });

  it('links to the edit page of the task', () => {
    render(STUDY);

    expect(el('a.edit')?.getAttribute('href')).toBe('/projects/10/tasks/1/edit');
    expect(el('a.edit')?.getAttribute('aria-label')).toBe('Edit Study ILT Module 4');
  });

  it('offers Archive and no Delete; tasks are deleted only from the Archive', () => {
    render(STUDY);

    expect(el('button[aria-label="Archive task Study ILT Module 4"]')).toBeTruthy();
    expect(el('button.delete')).toBeNull();
    expect(page.textContent).not.toContain('Delete');
  });

  it('shows priority as a tint and left accent with a tooltip, not as a tag', () => {
    render(STUDY);

    const item = el<HTMLElement>('.item')!;
    expect(item.classList).toContain('priority-tint');
    expect(item.getAttribute('title')).toMatch(/^Priority: /);
    expect(item.style.getPropertyValue('--priority-accent')).not.toBe('');
    expect(el('.priority')).toBeNull();
  });
});

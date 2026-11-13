import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Task } from '../../../../tasks/shared/types/task.types';
import type { TaskDayGroup } from '../../types/current-upcoming.types';
import { TaskGroup } from './task-group';

function task(taskId: number, overrides: Partial<Task> = {}): Task {
  return {
    taskId,
    projectId: 10,
    priorityId: 3,
    title: `Task ${taskId}`,
    description: null,
    scheduledDate: null,
    dueDate: '2026-11-06',
    deadline: null,
    recurrence: 'none',
    recurrenceDays: [],
    recurrenceEndDate: null,
    completedAt: null,
    sortOrder: 0,
    isRecurring: false,
    isArchived: false,
    labels: [],
    ...overrides,
  };
}

describe('TaskGroup', () => {
  function render(group: TaskDayGroup): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TaskGroup);
    fixture.componentRef.setInput('group', group);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const today = (tasks: Task[]): TaskDayGroup => ({
    key: 'today',
    label: 'Today',
    emptyMessage: 'Nothing due today.',
    tasks,
  });

  it('shows the label and how many tasks it holds', () => {
    const el = render(today([task(1), task(2)]));

    expect(el.querySelector('h3')?.textContent).toContain('Today');
    expect(el.querySelector('.count')?.textContent?.trim()).toBe('2');
    expect(el.querySelector('section')?.getAttribute('aria-labelledby')).toBe('task-group-today');
  });

  it('lists each task with its priority and a link to edit it', () => {
    const el = render(today([task(1, { title: 'Study', priorityId: 1 })]));

    const items = el.querySelectorAll('li.task');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.priority')?.textContent?.trim()).toBe('High');
    const link = items[0].querySelector('a.title');
    expect(link?.textContent?.trim()).toBe('Study');
    expect(link?.getAttribute('href')).toBe('/projects/10/tasks/1/edit');
  });

  it('shows the title without a link when the task has no project', () => {
    const el = render(today([task(1, { projectId: 0 })]));

    expect(el.querySelector('a.title')).toBeNull();
    expect(el.querySelector('span.title')?.textContent?.trim()).toBe('Task 1');
  });

  it('shows the empty message when there are no tasks', () => {
    const el = render(today([]));

    expect(el.querySelector('ul')).toBeNull();
    expect(el.querySelector('.empty')?.textContent?.trim()).toBe('Nothing due today.');
  });

  it('shows due dates only in Later', () => {
    expect(render(today([task(1)])).querySelector('.due')).toBeNull();

    TestBed.resetTestingModule();
    const el = render({
      key: 'later',
      label: 'Later',
      emptyMessage: 'Nothing else due this week.',
      // This year, so the date is shown without one.
      tasks: [task(1, { dueDate: `${new Date().getFullYear()}-11-10` })],
    });
    expect(el.querySelector('.due')?.textContent?.trim()).toBe('Nov 10');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { formatDate, formatTime } from '../../../../tasks/task-crud/components/task-item/task-item';
import { dashboardTask } from '../../../testing/helpers/dashboard-task';
import type { DayGroup } from '../../types/current-upcoming.types';
import { TaskGroup } from './task-group';

const STUDY = dashboardTask({
  taskId: 25,
  projectId: 10,
  priorityId: 1,
  title: 'Submit documentation',
  dueDate: '2026-11-05',
  dueTime: '17:00:00',
  deadline: '2026-11-06',
  status: 'current',
  labels: [{ labelId: 3, name: 'Study', color: '#2563EB' }],
});
const ERRAND = dashboardTask({ taskId: 26, title: 'Buy groceries', dueDate: '2026-11-05' });

const group = (key: DayGroup['key'], tasks = [STUDY, ERRAND]): DayGroup => ({
  key,
  title: { today: 'Today', tomorrow: 'Tomorrow', later: 'Later' }[key],
  date: key === 'later' ? null : key === 'today' ? '2026-11-05' : '2026-11-06',
  tasks,
});

describe('TaskGroup', () => {
  let fixture: ComponentFixture<TaskGroup>;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const all = (selector: string) => Array.from(page.querySelectorAll(selector));
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';

  function render(value: DayGroup, emptyText?: string): void {
    fixture.componentRef.setInput('group', value);
    if (emptyText !== undefined) fixture.componentRef.setInput('emptyText', emptyText);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(TaskGroup);
    page = fixture.nativeElement;
  });

  it('labels the section with its title, count and date', () => {
    render(group('today'));

    const section = el('section')!;
    expect(text('h3')).toBe('Today');
    expect(section.getAttribute('aria-labelledby')).toBe(el('h3')!.id);
    expect(section.dataset['day']).toBe('today');
    expect(text('.count')).toBe('2');
    expect(el('.count')?.getAttribute('aria-label')).toBe('2 tasks');
    expect(text('.date')).toBe(formatDate('2026-11-05'));
  });

  it('says "1 task" for a single task', () => {
    render(group('today', [STUDY]));

    expect(el('.count')?.getAttribute('aria-label')).toBe('1 task');
  });

  it('has no date for Later, which spans many days', () => {
    render(group('later'));

    expect(el('.date')).toBeNull();
  });

  it('lists the tasks in the order given, linking each to its edit page', () => {
    render(group('today'));

    const links = all('.title') as HTMLAnchorElement[];
    expect(links.map((a) => a.textContent)).toEqual(['Submit documentation', 'Buy groceries']);
    expect(links[0].getAttribute('href')).toBe('/projects/10/tasks/25/edit');
  });

  it('shows the priority, deadline and labels of a task', () => {
    render(group('today', [STUDY]));

    expect(text('.priority')).toBe('P1');
    expect(el('.priority')?.getAttribute('aria-label')).toBe('Priority 1');
    expect(text('.deadline')).toBe(`Deadline ${formatDate('2026-11-06')}`);
    expect(text('app-label-chip .name')).toBe('Study');
  });

  it('shows only the time in Today and Tomorrow', () => {
    render(group('tomorrow', [{ ...STUDY, dueDate: '2026-11-06' }]));

    expect(text('.when')).toBe(formatTime('17:00:00'));
  });

  it('shows nothing for an untimed task in Today', () => {
    render(group('today', [ERRAND]));

    expect(el('.when')).toBeNull();
    expect(el('.deadline')).toBeNull();
    expect(el('.labels')).toBeNull();
  });

  it('shows the date, and the time when there is one, in Later', () => {
    render(
      group('later', [
        { ...STUDY, dueDate: '2026-11-20' },
        { ...ERRAND, dueDate: '2026-11-21' },
      ]),
    );

    expect(all('.when').map((e) => e.textContent)).toEqual([
      `${formatDate('2026-11-20')}, ${formatTime('17:00:00')}`,
      formatDate('2026-11-21'),
    ]);
  });

  it('shows a message for each empty day', () => {
    render(group('today', []));
    expect(el('.tasks')).toBeNull();
    expect(text('.empty')).toBe('Nothing due today.');

    render(group('tomorrow', []));
    expect(text('.empty')).toBe('Nothing due tomorrow.');

    render(group('later', []));
    expect(text('.empty')).toBe('Nothing else coming up.');
  });

  it('uses a custom empty message when given one', () => {
    render(group('today', []), 'Enjoy the free day.');

    expect(text('.empty')).toBe('Enjoy the free day.');
  });
});

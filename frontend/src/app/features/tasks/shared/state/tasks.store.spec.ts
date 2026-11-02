import { TestBed } from '@angular/core/testing';
import type { Task } from '../types/task.types';
import { TasksStore } from './tasks.store';

const task = (overrides: Partial<Task>): Task => ({
  taskId: 1,
  projectId: 10,
  priorityId: 3,
  title: 'Task',
  description: null,
  dueDate: null,
  deadline: null,
  recurrence: 'none',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
  ...overrides,
});

const READ = task({ taskId: 1, title: 'Read', sortOrder: 2 });
const WRITE = task({ taskId: 2, title: 'Write', sortOrder: 0 });
const DONE = task({ taskId: 3, title: 'Done', sortOrder: 1, completedAt: '2026-10-01T10:00:00Z' });
const OLD = task({ taskId: 4, title: 'Old', isArchived: true });

describe('TasksStore', () => {
  let store: TasksStore;

  beforeEach(() => {
    store = TestBed.inject(TasksStore);
  });

  it('starts empty and idle', () => {
    expect(store.tasks()).toEqual([]);
    expect(store.projectId()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('marks loading for a project and clears an earlier error', () => {
    store.fail('Boom');
    store.startLoading(10);

    expect(store.projectId()).toBe(10);
    expect(store.loading()).toBe(true);
    expect(store.error()).toBeNull();
  });

  it('lists tasks by sortOrder and splits open from completed', () => {
    store.setTasks(10, [READ, DONE, WRITE]);

    expect(store.tasks().map((t) => t.title)).toEqual(['Write', 'Done', 'Read']);
    expect(store.open().map((t) => t.title)).toEqual(['Write', 'Read']);
    expect(store.completed().map((t) => t.title)).toEqual(['Done']);
    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(true);
  });

  it('keeps archived tasks out of the list', () => {
    store.setTasks(10, [READ, OLD]);

    expect(store.tasks()).toEqual([READ]);
    expect(store.byId(4)).toEqual(OLD);
  });

  it('keeps the tasks when reloading the same project', () => {
    store.setTasks(10, [READ]);
    store.startLoading(10);

    expect(store.tasks()).toEqual([READ]);
    expect(store.loaded()).toBe(true);
  });

  it('drops the old tasks when switching to another project', () => {
    store.setTasks(10, [READ]);
    store.startLoading(11);

    expect(store.tasks()).toEqual([]);
    expect(store.loaded()).toBe(false);
  });

  it('records a failure and stops loading', () => {
    store.startLoading(10);
    store.fail('Something went wrong.');

    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Something went wrong.');
  });

  it('adds a new task and replaces an existing one', () => {
    store.setTasks(10, [READ]);

    store.upsert(WRITE);
    store.upsert({ ...READ, title: 'Read again' });

    expect(store.tasks().map((t) => t.title)).toEqual(['Write', 'Read again']);
  });

  it('patches only the given fields and never the id', () => {
    store.setTasks(10, [READ]);

    store.patch(1, { description: 'Chapter 4', taskId: 99 });

    expect(store.byId(1)).toEqual({ ...READ, description: 'Chapter 4' });
  });

  it('drops a task from the list once it moves to another project', () => {
    store.setTasks(10, [READ, WRITE]);

    store.patch(1, { projectId: 11 });

    expect(store.tasks()).toEqual([WRITE]);
    expect(store.byId(1)?.projectId).toBe(11);
  });

  it('removes a task', () => {
    store.setTasks(10, [READ, WRITE]);

    store.remove(1);

    expect(store.byId(1)).toBeUndefined();
    expect(store.tasks()).toEqual([WRITE]);
  });

  it('resets to the initial state', () => {
    store.setTasks(10, [READ]);
    store.fail('Boom');

    store.reset();

    expect(store.tasks()).toEqual([]);
    expect(store.projectId()).toBeNull();
    expect(store.loaded()).toBe(false);
    expect(store.error()).toBeNull();
  });
});

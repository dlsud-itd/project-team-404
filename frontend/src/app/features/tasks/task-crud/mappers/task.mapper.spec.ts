import type { ApiTask } from '../../shared/types/task.types';
import { toCreateTaskBody, toTask, toUpdateTaskBody } from './task.mapper';

const API_TASK: ApiTask = {
  id: 1,
  projectId: 10,
  title: 'Study ILT Module 4',
  description: 'Read all lessons',
  priority: 'medium',
  scheduledDate: null,
  dueDate: '2026-10-02',
  deadline: '2026-10-05T15:59:59.999Z',
  recurrence: 'weekly',
  isDone: false,
  doneAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  labels: [{ id: 3, name: 'Study', color: '#2563EB' }],
};

describe('toTask', () => {
  it('turns an API task into the shape the app uses', () => {
    expect(toTask(API_TASK)).toEqual({
      taskId: 1,
      projectId: 10,
      priorityId: 2,
      title: 'Study ILT Module 4',
      description: 'Read all lessons',
      dueDate: '2026-10-02',
      deadline: '2026-10-05T15:59:59.999Z',
      recurrence: 'weekly',
      completedAt: null,
      sortOrder: 0,
      isRecurring: true,
      isArchived: false,
      labels: [{ labelId: 3, name: 'Study', color: '#2563EB' }],
    });
  });

  it.each([
    ['high', 1],
    ['medium', 2],
    ['low', 3],
  ] as const)('gives %s priority the id %i', (priority, priorityId) => {
    expect(toTask({ ...API_TASK, priority }).priorityId).toBe(priorityId);
  });

  it.each(['none', null] as const)('treats a recurrence of %s as not repeating', (recurrence) => {
    expect(toTask({ ...API_TASK, recurrence })).toMatchObject({
      recurrence: 'none',
      isRecurring: false,
    });
  });

  it('uses doneAt as the completion time', () => {
    const doneAt = '2026-10-01T10:00:00.000Z';

    expect(toTask({ ...API_TASK, isDone: true, doneAt }).completedAt).toBe(doneAt);
  });

  it('keeps a done task completed when it has no doneAt', () => {
    expect(toTask({ ...API_TASK, isDone: true }).completedAt).toBe(API_TASK.updatedAt);
  });
});

describe('toCreateTaskBody', () => {
  it('sends the priority by name and only fields the API accepts', () => {
    expect(
      toCreateTaskBody({
        projectId: 10,
        priorityId: 1,
        title: 'Gym',
        description: null,
        dueDate: '2026-10-02',
        deadline: '2026-10-03T15:59:59.999Z',
        recurrence: 'daily',
      }),
    ).toEqual({
      projectId: 10,
      priority: 'high',
      title: 'Gym',
      description: null,
      dueDate: '2026-10-02',
      deadline: '2026-10-03T15:59:59.999Z',
      recurrence: 'daily',
    });
  });
});

describe('toUpdateTaskBody', () => {
  it('sends a changed priority by name', () => {
    expect(toUpdateTaskBody({ title: 'Gym', priorityId: 3 })).toEqual({
      title: 'Gym',
      priority: 'low',
    });
  });

  it('leaves out the priority when it did not change', () => {
    expect(toUpdateTaskBody({ description: null })).toEqual({ description: null });
  });
});

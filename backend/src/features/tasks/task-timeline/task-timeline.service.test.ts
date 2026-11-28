import { describe, expect, it, vi } from 'vitest';
import type { TimelineTaskRecord } from './models/timeline-task.model';
import { TaskTimelineService } from './task-timeline.service';
import { timelineQueryValidator } from './validators/timeline-query.validator';

const query = timelineQueryValidator.parse({
  from: '2026-11-16',
  to: '2026-11-22',
});

function timelineTask(
  overrides: Partial<TimelineTaskRecord> = {}
): TimelineTaskRecord {
  return {
    id: 1,
    title: 'Planning',
    projectId: 7,
    scheduledDate: new Date('2026-11-15T00:00:00.000Z'),
    dueDate: new Date('2026-11-24T00:00:00.000Z'),
    isDone: false,
    project: { name: 'Roadmap', color: '#2563EB' },
    priorityLevel: { name: 'High' },
    ...overrides,
  };
}

describe('TaskTimelineService', () => {
  it('groups overlapping bars by project and counts undated tasks', async () => {
    const listTimelineTasks = vi.fn().mockResolvedValue({
      tasks: [
        timelineTask(),
        timelineTask({
          id: 2,
          title: 'Same day',
          scheduledDate: null,
          dueDate: new Date('2026-11-18T00:00:00.000Z'),
        }),
        timelineTask({
          id: 3,
          scheduledDate: new Date('2026-11-01T00:00:00.000Z'),
          dueDate: new Date('2026-11-10T00:00:00.000Z'),
        }),
        timelineTask({
          id: 4,
          scheduledDate: null,
          dueDate: null,
        }),
      ],
      timeZone: 'UTC',
      today: '2026-11-19',
    });
    const service = new TaskTimelineService({ listTimelineTasks });

    const result = await service.list('owner-1', query);

    expect(listTimelineTasks).toHaveBeenCalledWith('owner-1', query);
    expect(result.undatedCount).toBe(1);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]).toMatchObject({
      projectId: 7,
      projectName: 'Roadmap',
      projectColor: '#2563EB',
    });
    expect(result.projects[0]!.bars).toEqual([
      expect.objectContaining({
        id: 1,
        start: '2026-11-15',
        end: '2026-11-24',
        isOverdue: false,
        priority: 'high',
      }),
      expect.objectContaining({
        id: 2,
        start: '2026-11-18',
        end: '2026-11-18',
      }),
    ]);
  });

  it('includes completed bars when returned by the query and marks them not overdue', async () => {
    const listTimelineTasks = vi.fn().mockResolvedValue({
      tasks: [
        timelineTask({
          isDone: true,
          scheduledDate: new Date('2026-11-18T00:00:00.000Z'),
        }),
      ],
      timeZone: 'UTC',
      today: '2026-11-19',
    });
    const service = new TaskTimelineService({ listTimelineTasks });

    const result = await service.list('owner-1', {
      ...query,
      includeCompleted: true,
    });

    expect(result.projects[0]!.bars[0]).toMatchObject({
      isDone: true,
      isOverdue: false,
    });
  });
});

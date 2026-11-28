import type { TimelineTaskRecord } from './models/timeline-task.model';
import { toTimelineTaskModel } from './models/timeline-task.model';
import type { TimelineQuery } from './validators/timeline-query.validator';
import type {
  TimelineProjectGroup,
  TimelineQueryResult,
  TimelineResponse,
} from './types/timeline.types';

export type TaskTimelineDependencies = {
  listTimelineTasks(
    userId: string,
    query: TimelineQuery
  ): Promise<TimelineQueryResult>;
};

export class TaskTimelineService {
  constructor(private readonly dependencies: TaskTimelineDependencies) {}

  async list(userId: string, query: TimelineQuery): Promise<TimelineResponse> {
    const { tasks, today } = await this.dependencies.listTimelineTasks(
      userId,
      query
    );
    const bars = tasks.flatMap((task: TimelineTaskRecord) => {
      const bar = toTimelineTaskModel(task, today);
      return bar && bar.start <= query.to && bar.end >= query.from ? [bar] : [];
    });
    const groups = new Map<string, TimelineProjectGroup>();

    for (const bar of bars) {
      const key = bar.projectId === null ? 'inbox' : String(bar.projectId);
      let group = groups.get(key);
      if (!group) {
        group = {
          projectId: bar.projectId,
          projectName: bar.projectName,
          projectColor: bar.projectColor,
          bars: [],
        };
        groups.set(key, group);
      }
      group.bars.push(bar);
    }

    return {
      from: query.from,
      to: query.to,
      projects: [...groups.values()],
      undatedCount: tasks.filter((task) => !task.scheduledDate && !task.dueDate)
        .length,
    };
  }
}

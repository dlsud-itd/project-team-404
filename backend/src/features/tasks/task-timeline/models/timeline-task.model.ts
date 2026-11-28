import type { TaskSpanSource } from '../utils/task-span.util';
import { getTaskSpan } from '../utils/task-span.util';

export type TimelineTaskRecord = TaskSpanSource & {
  id: number;
  title: string;
  projectId: number | null;
  isDone: boolean;
  project: { name: string; color: string | null } | null;
  priorityLevel: { name: string };
};

export type TimelineTask = {
  id: number;
  title: string;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  start: string;
  end: string;
  isDone: boolean;
  isOverdue: boolean;
  priority: string;
};

export function toTimelineTaskModel(
  task: TimelineTaskRecord,
  today: string
): TimelineTask | null {
  const span = getTaskSpan(task);
  if (!span) return null;

  return {
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    projectName: task.project?.name ?? null,
    projectColor: task.project?.color ?? null,
    start: span.start,
    end: span.end,
    isDone: task.isDone,
    isOverdue: !task.isDone && span.end < today,
    priority: task.priorityLevel.name.toLowerCase(),
  };
}

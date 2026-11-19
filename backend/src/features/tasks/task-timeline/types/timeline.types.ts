import type {
  TimelineTask,
  TimelineTaskRecord,
} from '../models/timeline-task.model';

export type TimelineQueryResult = {
  tasks: TimelineTaskRecord[];
  timeZone: string;
  today: string;
};

export type TimelineProjectGroup = {
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  bars: TimelineTask[];
};

export type TimelineResponse = {
  from: string;
  to: string;
  projects: TimelineProjectGroup[];
  undatedCount: number;
};

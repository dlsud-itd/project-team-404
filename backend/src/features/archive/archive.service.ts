import { toLabelModel } from '../labels/shared/models/label.model';
import { toProjectModel } from '../projects/shared/models/project.model';
import { toTaskModel } from '../tasks/shared/models/task.model';
import { listArchivedLabels } from './db/queries/list-archived-labels.query';
import { listArchivedProjects } from './db/queries/list-archived-projects.query';
import { listArchivedTasks } from './db/queries/list-archived-tasks.query';
import type {
  ArchiveCursor,
  ArchivePage,
  ArchiveQuery,
  ArchiveResponse,
} from './types/archive.types';
import type { LabelListRecord } from '../labels/shared/models/label.model';
import type { ProjectRecord } from '../projects/shared/models/project.model';
import type { TaskRecord } from '../tasks/shared/models/task.model';
import {
  compareArchiveEntries,
  encodeArchiveCursor,
} from './utils/archive-cursor';

export type ArchiveDependencies = {
  listArchivedTasks(
    userId: string,
    limit: number,
    cursor?: ArchiveCursor
  ): Promise<ArchivePage<TaskRecord>>;
  listArchivedProjects(
    userId: string,
    limit: number,
    cursor?: ArchiveCursor
  ): Promise<ArchivePage<ProjectRecord>>;
  listArchivedLabels(
    userId: string,
    limit: number,
    cursor?: ArchiveCursor
  ): Promise<ArchivePage<LabelListRecord>>;
};

const emptyTasks: ArchivePage<TaskRecord> = { items: [], total: 0 };
const emptyProjects: ArchivePage<ProjectRecord> = { items: [], total: 0 };
const emptyLabels: ArchivePage<LabelListRecord> = { items: [], total: 0 };

export class ArchiveService {
  constructor(
    private readonly dependencies: ArchiveDependencies = {
      listArchivedTasks,
      listArchivedProjects,
      listArchivedLabels,
    }
  ) {}

  async list(userId: string, query: ArchiveQuery): Promise<ArchiveResponse> {
    const includes = (type: 'tasks' | 'projects' | 'labels') =>
      query.type === 'all' || query.type === type;
    const [tasks, projects, labels] = await Promise.all([
      includes('tasks')
        ? this.dependencies.listArchivedTasks(userId, query.limit, query.cursor)
        : Promise.resolve(emptyTasks),
      includes('projects')
        ? this.dependencies.listArchivedProjects(
            userId,
            query.limit,
            query.cursor
          )
        : Promise.resolve(emptyProjects),
      includes('labels')
        ? this.dependencies.listArchivedLabels(
            userId,
            query.limit,
            query.cursor
          )
        : Promise.resolve(emptyLabels),
    ]);

    const entries = [
      ...tasks.items.map((record) => ({
        type: 'tasks' as const,
        id: record.id,
        archivedAt: requireArchivedAt(record.archivedAt),
        record,
      })),
      ...projects.items.map((record) => ({
        type: 'projects' as const,
        id: record.id,
        archivedAt: requireArchivedAt(record.archivedAt),
        record,
      })),
      ...labels.items.map((record) => ({
        type: 'labels' as const,
        id: record.id,
        archivedAt: requireArchivedAt(record.archivedAt),
        record,
      })),
    ].sort(compareArchiveEntries);
    const page = entries.slice(0, query.limit);
    const hasMore = entries.length > query.limit;
    const last = page.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeArchiveCursor({
            type: last.type,
            id: last.id,
            archivedAt: last.archivedAt.toISOString(),
          })
        : null;

    return {
      tasks: {
        items: page
          .filter((entry) => entry.type === 'tasks')
          .map((entry) => toTaskModel(entry.record)),
        total: tasks.total,
      },
      projects: {
        items: page
          .filter((entry) => entry.type === 'projects')
          .map((entry) => toProjectModel(entry.record)),
        total: projects.total,
      },
      labels: {
        items: page
          .filter((entry) => entry.type === 'labels')
          .map((entry) =>
            toLabelModel(entry.record, entry.record._count.taskLabels)
          ),
        total: labels.total,
      },
      nextCursor,
    };
  }
}

function requireArchivedAt(archivedAt: Date | null) {
  if (archivedAt === null) {
    throw new Error('Archived query returned a record without archivedAt');
  }
  return archivedAt;
}

import { formatDate } from '../../tasks/task-scheduling/utils/date-format.util';
import type { ArchiveItem, ArchiveKind, ArchiveTab } from '../types/archive.types';

const NOUN: Record<ArchiveKind, string> = {
  task: 'Task',
  project: 'Project',
  label: 'Label',
  priority: 'Priority',
};

const TAB_LABEL: Record<ArchiveTab, string> = {
  all: 'All',
  tasks: 'Tasks',
  projects: 'Projects',
  labels: 'Labels',
  priorities: 'Priorities',
};

/** "Task", "Project" or "Label". */
export function kindNoun(kind: ArchiveKind): string {
  return NOUN[kind];
}

/** The tab's visible name, e.g. "Projects". */
export function tabLabel(tab: ArchiveTab): string {
  return TAB_LABEL[tab];
}

/** "Task “Buy milk” archived" */
export function archivedToast(kind: ArchiveKind, name: string): string {
  return `${NOUN[kind]} “${name}” archived`;
}

/** "Label “Work” restored" */
export function restoredToast(kind: ArchiveKind, name: string): string {
  return `${NOUN[kind]} “${name}” restored`;
}

/** "Project “Home” deleted" */
export function deletedToast(kind: ArchiveKind, name: string): string {
  return `${NOUN[kind]} “${name}” deleted`;
}

export function archiveFailedToast(kind: ArchiveKind, name: string): string {
  return `Couldn't archive ${NOUN[kind].toLowerCase()} “${name}”. Please try again.`;
}

export function restoreFailedToast(kind: ArchiveKind, name: string): string {
  return `Couldn't restore ${NOUN[kind].toLowerCase()} “${name}”. Please try again.`;
}

export function deleteFailedToast(kind: ArchiveKind, name: string): string {
  return `Couldn't delete ${NOUN[kind].toLowerCase()} “${name}”. Please try again.`;
}

/** The empty-state text for a tab of the Archive page. */
export function emptyState(tab: ArchiveTab): { title: string; hint: string } {
  switch (tab) {
    case 'tasks':
      return {
        title: 'No archived tasks',
        hint: 'Archive a task from its menu to hide it without deleting it.',
      };
    case 'projects':
      return {
        title: 'No archived projects',
        hint: 'Archive a project from the project switcher to put it away.',
      };
    case 'labels':
      return {
        title: 'No archived labels',
        hint: 'Archive a label from Settings → Labels to hide it from the picker.',
      };
    case 'priorities':
      return {
        title: 'No archived priorities',
        hint: 'Archive a priority from Settings → Priorities to hide it from pickers and filters.',
      };
    default:
      return {
        title: 'Nothing archived yet',
        hint: 'Archived tasks, projects, labels and priorities show up here so you can restore them.',
      };
  }
}

/** The title and message of the "Delete permanently" confirmation. */
export function deleteConfirm(item: Pick<ArchiveItem, 'kind' | 'name' | 'taskCount'>): {
  title: string;
  message: string;
} {
  const title = `Delete ${NOUN[item.kind].toLowerCase()} “${item.name}” permanently?`;
  switch (item.kind) {
    case 'project':
      return {
        title,
        message: "Its tasks will move to your Inbox. This can't be undone.",
      };
    case 'label': {
      const count = item.taskCount ?? 0;
      const tasks = count === 1 ? '1 task' : `${count} tasks`;
      return {
        title,
        message: count
          ? `It will be removed from ${tasks}. This can't be undone.`
          : "This can't be undone.",
      };
    }
    case 'priority':
      return {
        title,
        message: item.taskCount
          ? "Choose a level for its tasks first. This can't be undone."
          : "This can't be undone.",
      };
    default:
      return { title, message: "The task and its history will be removed. This can't be undone." };
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * "Archived just now", "Archived 5 minutes ago", "Archived 3 hours ago", "Archived yesterday",
 * "Archived 4 days ago", then "Archived on Oct 2" from a week back.
 */
export function relativeArchived(archivedAt: string, now: Date = new Date()): string {
  const then = new Date(archivedAt);
  if (Number.isNaN(then.getTime())) return 'Archived';
  const elapsed = now.getTime() - then.getTime();

  if (elapsed < MINUTE) return 'Archived just now';
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `Archived ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const days = calendarDaysBetween(then, now);
  if (days === 0) {
    const hours = Math.floor(elapsed / HOUR);
    return `Archived ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (days === 1) return 'Archived yesterday';
  if (days < 7) return `Archived ${days} days ago`;
  return `Archived on ${formatDate(localDate(then), now)}`;
}

/** Whole local calendar days from `from` to `to`. */
function calendarDaysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / (24 * HOUR));
}

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

import {
  archiveFailedToast,
  archivedToast,
  deleteConfirm,
  deleteFailedToast,
  deletedToast,
  emptyState,
  kindNoun,
  relativeArchived,
  restoreFailedToast,
  restoredToast,
  tabLabel,
} from './archive-labels.util';

describe('archive labels', () => {
  describe('toasts', () => {
    it('names the kind and the item', () => {
      expect(archivedToast('task', 'Buy milk')).toBe('Task “Buy milk” archived');
      expect(restoredToast('label', 'Work')).toBe('Label “Work” restored');
      expect(deletedToast('project', 'Home')).toBe('Project “Home” deleted');
    });

    it('says what failed and asks to try again', () => {
      expect(archiveFailedToast('task', 'Buy milk')).toBe(
        "Couldn't archive task “Buy milk”. Please try again.",
      );
      expect(restoreFailedToast('project', 'Home')).toBe(
        "Couldn't restore project “Home”. Please try again.",
      );
      expect(deleteFailedToast('label', 'Work')).toBe(
        "Couldn't delete label “Work”. Please try again.",
      );
    });
  });

  it('names kinds and tabs', () => {
    expect(kindNoun('task')).toBe('Task');
    expect(kindNoun('project')).toBe('Project');
    expect(kindNoun('label')).toBe('Label');
    expect(tabLabel('all')).toBe('All');
    expect(tabLabel('tasks')).toBe('Tasks');
    expect(tabLabel('projects')).toBe('Projects');
    expect(tabLabel('labels')).toBe('Labels');
  });

  it('has an empty state for every tab', () => {
    expect(emptyState('all').title).toBe('Nothing archived yet');
    expect(emptyState('tasks').title).toBe('No archived tasks');
    expect(emptyState('projects').title).toBe('No archived projects');
    expect(emptyState('labels').title).toBe('No archived labels');
    for (const tab of ['all', 'tasks', 'projects', 'labels'] as const) {
      expect(emptyState(tab).hint.length).toBeGreaterThan(0);
    }
  });

  describe('deleteConfirm', () => {
    it('warns that a project’s tasks move to the Inbox', () => {
      const text = deleteConfirm({ kind: 'project', name: 'Home' });
      expect(text.title).toBe('Delete project “Home” permanently?');
      expect(text.message).toContain('Its tasks will move to your Inbox');
    });

    it('counts the tasks a label is removed from', () => {
      expect(deleteConfirm({ kind: 'label', name: 'Work', taskCount: 1 }).message).toContain(
        'removed from 1 task.',
      );
      expect(deleteConfirm({ kind: 'label', name: 'Work', taskCount: 3 }).message).toContain(
        'removed from 3 tasks.',
      );
      expect(deleteConfirm({ kind: 'label', name: 'Work', taskCount: 0 }).message).toBe(
        "This can't be undone.",
      );
    });

    it('warns that a task cannot come back', () => {
      const text = deleteConfirm({ kind: 'task', name: 'Buy milk' });
      expect(text.title).toBe('Delete task “Buy milk” permanently?');
      expect(text.message).toContain("can't be undone");
    });
  });

  describe('relativeArchived', () => {
    const now = new Date(2026, 10, 21, 15, 0, 0);
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
    const MINUTE = 60_000;
    const HOUR = 60 * MINUTE;

    it('says "just now" under a minute', () => {
      expect(relativeArchived(ago(30_000), now)).toBe('Archived just now');
    });

    it('counts minutes under an hour', () => {
      expect(relativeArchived(ago(MINUTE), now)).toBe('Archived 1 minute ago');
      expect(relativeArchived(ago(59 * MINUTE), now)).toBe('Archived 59 minutes ago');
    });

    it('counts hours on the same day', () => {
      expect(relativeArchived(ago(HOUR), now)).toBe('Archived 1 hour ago');
      expect(relativeArchived(ago(5 * HOUR), now)).toBe('Archived 5 hours ago');
    });

    it('says "yesterday" for the previous calendar day', () => {
      const lateYesterday = new Date(2026, 10, 20, 23, 30).toISOString();
      expect(relativeArchived(lateYesterday, now)).toBe('Archived yesterday');
    });

    it('counts days within a week', () => {
      expect(relativeArchived(new Date(2026, 10, 18, 9).toISOString(), now)).toBe(
        'Archived 3 days ago',
      );
      expect(relativeArchived(new Date(2026, 10, 15, 9).toISOString(), now)).toBe(
        'Archived 6 days ago',
      );
    });

    it('shows the date from a week back, with the year when it differs', () => {
      expect(relativeArchived(new Date(2026, 10, 14, 9).toISOString(), now)).toBe(
        'Archived on Nov 14',
      );
      expect(relativeArchived(new Date(2025, 9, 2, 9).toISOString(), now)).toBe(
        'Archived on Oct 2, 2025',
      );
    });

    it('falls back to "Archived" for a missing date', () => {
      expect(relativeArchived('', now)).toBe('Archived');
    });
  });
});

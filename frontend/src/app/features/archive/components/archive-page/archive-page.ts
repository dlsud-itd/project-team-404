import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, map } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { ProjectService } from '../../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { DeletePriorityDialog } from '../../../settings/priorities/delete-priority-dialog/delete-priority-dialog';
import { PrioritiesStore } from '../../../settings/state/priorities.store';
import type { PriorityLevel } from '../../../settings/types/settings.types';
import { ArchiveService } from '../../services/archive.service';
import { ArchiveUndoService } from '../../services/archive-undo.service';
import {
  ARCHIVE_TABS,
  type ArchiveCounts,
  type ArchiveItem,
  type ArchiveTab,
} from '../../types/archive.types';
import {
  deleteConfirm,
  deleteFailedToast,
  deletedToast,
  emptyState,
  kindNoun,
  relativeArchived,
  tabLabel,
} from '../../utils/archive-labels.util';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

/** Reads the `tab` query parameter; anything unknown means All. */
export function asArchiveTab(value: unknown): ArchiveTab {
  return ARCHIVE_TABS.find((tab) => tab === value) ?? 'all';
}

const COUNT_KEY: Record<ArchiveItem['kind'], Exclude<ArchiveTab, 'all'>> = {
  task: 'tasks',
  project: 'projects',
  label: 'labels',
  priority: 'priorities',
};

/**
 * /archive: every archived task, project, label and priority in one place, newest first. Items
 * can be restored (optimistically) or deleted for good after a confirmation. This is the only
 * place anything is deleted permanently.
 */
@Component({
  selector: 'app-archive-page',
  imports: [RouterLink, ConfirmDialog, DeletePriorityDialog],
  templateUrl: './archive-page.html',
  styleUrl: './archive-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivePage {
  private readonly archive = inject(ArchiveService);
  private readonly undo = inject(ArchiveUndoService);
  private readonly toast = inject(ToastService);
  private readonly projects = inject(ProjectsStore);
  private readonly projectService = inject(ProjectService);
  protected readonly priorities = inject(PrioritiesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = ARCHIVE_TABS;
  protected readonly tabLabel = tabLabel;
  protected readonly kindNoun = kindNoun;

  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(map((params) => asArchiveTab(params.get('tab')))),
    { initialValue: asArchiveTab(this.route.snapshot.queryParamMap.get('tab')) },
  );

  protected readonly items = signal<ArchiveItem[]>([]);
  protected readonly counts = signal<ArchiveCounts | null>(null);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadMoreError = signal<string | null>(null);

  /** The item waiting on "Delete permanently?", if the dialog is open. */
  protected readonly confirming = signal<ArchiveItem | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly confirmText = computed(() => {
    const item = this.confirming();
    return item && item.kind !== 'priority' ? deleteConfirm(item) : null;
  });
  /**
   * A priority being deleted, shaped for the dialog that asks where its tasks go. Its tasks can
   * only move to a level that is still in use.
   */
  protected readonly confirmingPriority = computed<PriorityLevel | null>(() => {
    const item = this.confirming();
    if (item?.kind !== 'priority') return null;
    return {
      id: item.id,
      name: item.name,
      color: item.color ?? null,
      sortOrder: 0,
      isDefault: false,
      taskCount: item.taskCount ?? null,
      isArchived: true,
    };
  });

  protected readonly empty = computed(() => emptyState(this.tab()));
  /** Read out by screen readers after each change. */
  protected readonly announcement = signal('');

  private request?: Subscription;
  private readonly now = signal(new Date());

  constructor() {
    if (!this.projects.loaded() && !this.projects.loading()) {
      // Task rows show their project's name; the archive response only has the id.
      this.projectService
        .refresh()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => {} });
    }

    effect(() => {
      const tab = this.tab();
      untracked(() => this.load(tab));
    });
  }

  protected count(tab: ArchiveTab): number | null {
    return this.counts()?.[tab] ?? null;
  }

  protected select(tab: ArchiveTab): void {
    if (tab === this.tab()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'all' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

  /** Arrow keys, Home and End move between tabs, as in the ARIA tabs pattern. */
  protected onTabKey(event: KeyboardEvent): void {
    const last = ARCHIVE_TABS.length - 1;
    const current = ARCHIVE_TABS.indexOf(this.tab());
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % ARCHIVE_TABS.length
        : event.key === 'ArrowLeft'
          ? (current + last) % ARCHIVE_TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    this.select(ARCHIVE_TABS[next]);
    const tablist = event.currentTarget as HTMLElement | null;
    tablist?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }

  protected archivedLabel(item: ArchiveItem): string {
    return relativeArchived(item.archivedAt, this.now());
  }

  /** A task's project name, looked up again once the project list has loaded. */
  protected projectName(item: ArchiveItem): string | null {
    if (item.projectName) return item.projectName;
    if (item.projectId == null) return null;
    return this.projects.projects().find((p) => p.projectId === item.projectId)?.name ?? null;
  }

  protected projectColor(item: ArchiveItem): string | null {
    if (item.color) return item.color;
    if (item.projectId == null) return null;
    return this.projects.projects().find((p) => p.projectId === item.projectId)?.color ?? null;
  }

  protected retry(): void {
    this.load(this.tab());
  }

  protected loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.loadMoreError.set(null);
    const tab = this.tab();
    this.request = this.archive
      .list(tab, cursor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const seen = new Set(this.items().map(rowKey));
          this.items.update((items) => [
            ...items,
            ...page.items.filter((item) => !seen.has(rowKey(item))),
          ]);
          this.nextCursor.set(page.nextCursor);
          this.loadingMore.set(false);
          this.announcement.set(`Loaded ${page.items.length} more.`);
        },
        error: () => {
          this.loadingMore.set(false);
          this.loadMoreError.set("Couldn't load more. Please try again.");
        },
      });
  }

  protected restore(item: ArchiveItem): void {
    const index = this.items().indexOf(item);
    this.undo.restore(item, {
      announce: true,
      apply: () => {
        this.removeRow(item);
        this.announcement.set(`Restored ${item.name}.`);
      },
      rollback: () => this.putBack(item, index),
    });
  }

  protected askDelete(item: ArchiveItem): void {
    this.deleteError.set(null);
    this.confirming.set(item);
  }

  protected cancelDelete(): void {
    this.confirming.set(null);
    this.deleteError.set(null);
  }

  protected confirmDelete(reassignTo: number | null = null): void {
    const item = this.confirming();
    if (!item || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.archive
      .deletePermanently(item.kind, item.id, reassignTo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.confirming.set(null);
          this.removeRow(item);
          this.toast.info(deletedToast(item.kind, item.name));
          this.announcement.set(`Deleted ${item.name}.`);
        },
        error: () => {
          this.deleting.set(false);
          this.deleteError.set(deleteFailedToast(item.kind, item.name));
        },
      });
  }

  private load(tab: ArchiveTab): void {
    this.request?.unsubscribe();
    this.now.set(new Date());
    this.loading.set(true);
    this.loadingMore.set(false);
    this.error.set(null);
    this.loadMoreError.set(null);
    this.items.set([]);
    this.nextCursor.set(null);

    this.request = this.archive
      .list(tab)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.nextCursor.set(page.nextCursor);
          this.mergeCounts(tab, page.counts);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set("Couldn't load your archive.");
        },
      });

    // A single-type request reports 0 for the other types, so fetch the real totals once.
    if (tab !== 'all' && this.counts() === null) {
      this.archive
        .list('all', null, 1)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (page) => this.counts.set(page.counts), error: () => {} });
    }
  }

  /** Keeps every tab's total: All knows them all, other tabs only know their own. */
  private mergeCounts(tab: ArchiveTab, counts: ArchiveCounts): void {
    if (tab === 'all') {
      this.counts.set(counts);
      return;
    }
    const previous = this.counts() ?? { all: 0, tasks: 0, projects: 0, labels: 0, priorities: 0 };
    const next = { ...previous, [tab]: counts[tab] };
    this.counts.set({
      ...next,
      all: next.tasks + next.projects + next.labels + next.priorities,
    });
  }

  private removeRow(item: ArchiveItem): void {
    const key = rowKey(item);
    this.items.update((items) => items.filter((row) => rowKey(row) !== key));
    this.adjustCount(item, -1);
  }

  private putBack(item: ArchiveItem, index: number): void {
    this.items.update((items) => {
      if (items.some((row) => rowKey(row) === rowKey(item))) return items;
      const next = [...items];
      next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
      return next;
    });
    this.adjustCount(item, 1);
  }

  private adjustCount(item: ArchiveItem, by: number): void {
    this.counts.update((counts) => {
      if (!counts) return counts;
      const key = COUNT_KEY[item.kind];
      return {
        ...counts,
        [key]: Math.max(counts[key] + by, 0),
        all: Math.max(counts.all + by, 0),
      };
    });
  }
}

function rowKey(item: Pick<ArchiveItem, 'kind' | 'id'>): string {
  return `${item.kind}:${item.id}`;
}

import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TASK_VIEW_OPTIONS, type TaskView } from './types/task-view.types';

/** The query parameter that holds a project page's view. */
export const TASK_VIEW_PARAM = 'view';

/** Where the last view of each project is remembered, e.g. habittracker.taskView.10. */
export const taskViewStorageKey = (projectId: number) => `habittracker.taskView.${projectId}`;

/** A view the switcher can open, or null for anything else. */
export function parseTaskView(value: string | null | undefined): TaskView | null {
  return TASK_VIEW_OPTIONS.find((option) => option.view === value)?.view ?? null;
}

/**
 * Which view a project page shows. The ?view= query parameter wins, so links and Back open the
 * same view; without one, the page opens on the view last used for that project, then the list.
 * Every view the URL shows is remembered for its project.
 *
 * Provide it on the page component, so it reads that page's route. Storage can be missing or
 * throw (private mode, blocked site data); the page then just opens on the list.
 */
@Injectable()
export class TaskViewsStore {
  private readonly route = inject(ActivatedRoute);
  private readonly storage = storageOf(inject(DOCUMENT));

  private readonly urlView = signal<TaskView | null>(
    parseTaskView(this.route.snapshot.queryParamMap.get(TASK_VIEW_PARAM)),
  );
  private readonly projectId = signal<number | null>(null);
  /** The view saved for projectId, read once when the project opens. */
  private readonly saved = signal<TaskView | null>(null);

  readonly view = computed<TaskView>(() => this.urlView() ?? this.saved() ?? 'list');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.urlView.set(parseTaskView(params.get(TASK_VIEW_PARAM)));
      this.remember();
    });
  }

  /** Switches to another project's saved view; the router reuses the page between projects. */
  setProject(projectId: number): void {
    this.projectId.set(projectId);
    this.saved.set(this.read(projectId));
    this.remember();
  }

  /** Saves the URL's view for the current project. */
  private remember(): void {
    const projectId = this.projectId();
    const view = this.urlView();
    if (projectId === null || view === null) return;
    this.saved.set(view);
    try {
      this.storage?.setItem(taskViewStorageKey(projectId), view);
    } catch {
      // Full or blocked storage: the view just isn't remembered.
    }
  }

  private read(projectId: number): TaskView | null {
    try {
      return parseTaskView(this.storage?.getItem(taskViewStorageKey(projectId)));
    } catch {
      return null;
    }
  }
}

/** Reading window.localStorage itself throws when site data is blocked. */
function storageOf(document: Document): Storage | null {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

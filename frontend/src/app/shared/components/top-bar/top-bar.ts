import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, finalize, map } from 'rxjs';
import { SessionService } from '../../../features/auth/session/session.service';
import { TasksStore } from '../../../features/tasks/shared/state/tasks.store';
import type { Task } from '../../../features/tasks/shared/types/task.types';
import { NewTaskDialog } from '../../../features/tasks/task-crud/components/new-task-dialog/new-task-dialog';

export type HomeTab = 'dashboard' | 'tasks' | 'projects';

/** The tabs in the top bar, in the order they are shown. */
export const HOME_TABS: readonly { id: HomeTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'projects', label: 'Projects' },
];

/** Reads the `tab` query parameter; anything unknown means the dashboard. */
export function asTab(value: string | null | undefined): HomeTab {
  return HOME_TABS.find((t) => t.id === value)?.id ?? 'dashboard';
}

/** The bar above every signed-in page: tabs, "+ New Task" and the account menu. */
@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, NewTaskDialog],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  protected readonly session = inject(SessionService);
  protected readonly tasksStore = inject(TasksStore);
  private readonly router = inject(Router);

  protected readonly loggingOut = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly tabs = HOME_TABS;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  private readonly path = computed(() => this.url().split(/[?#]/)[0]);

  /** Whether the tab panels are on screen, which only the home page has. */
  protected readonly onHome = computed(() => this.path() === '/home');
  /** The tab this page belongs to; null on pages outside the tabs, such as Profile. */
  protected readonly tab = computed<HomeTab | null>(() => {
    if (this.onHome()) {
      const tab: unknown = this.router.parseUrl(this.url()).queryParams['tab'];
      return asTab(typeof tab === 'string' ? tab : null);
    }
    return this.path().startsWith('/projects') ? 'projects' : null;
  });
  protected readonly tabIndex = computed(() => HOME_TABS.findIndex((t) => t.id === this.tab()));
  /** The tab Tab-key focus lands on: the current one, or the first when there is none. */
  protected readonly focusableTab = computed(() => this.tab() ?? HOME_TABS[0].id);

  protected readonly initial = computed(
    () => this.session.currentUser()?.username?.charAt(0).toUpperCase() ?? '',
  );

  protected select(tab: HomeTab): void {
    void this.router.navigate(['/home'], {
      queryParams: tab === 'dashboard' ? {} : { tab },
    });
  }

  /** Arrow keys, Home and End move between tabs, as in the ARIA tabs pattern. */
  protected onTabKey(event: KeyboardEvent): void {
    const last = HOME_TABS.length - 1;
    const current = Math.max(this.tabIndex(), 0);
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % HOME_TABS.length
        : event.key === 'ArrowLeft'
          ? (current + last) % HOME_TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    this.select(HOME_TABS[next].id);
    const tablist = event.currentTarget as HTMLElement | null;
    tablist?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }

  /** Opens the new-task popup on the project on screen, or the Inbox on any other page. */
  protected newTask(): void {
    const project = /^\/projects\/(\d+)\//.exec(this.path());
    this.tasksStore.creating.set({ projectId: project ? Number(project[1]) : null });
  }

  /** The dashboard still shows sample data, so go to where the saved task appears. */
  protected showTask(task: Task): void {
    void this.router.navigate(['/projects', task.projectId, 'tasks']);
  }

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.session
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe(() => void this.router.navigateByUrl('/login'));
  }
}

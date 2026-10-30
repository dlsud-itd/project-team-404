import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionService } from '../auth/session/session.service';
import { ProjectList as ProjectsPage } from '../projects/project-crud/project-list/project-list';
import { AllTasks } from './board/all-tasks';
import { StatusColumns } from './board/status-columns';
import { DashboardStore } from './dashboard.store';
import { MiniCalendar } from './sidebar/mini-calendar';
import { PriorityList } from './sidebar/priority-list';
import { ProjectList } from './sidebar/project-list';

export type HomeTab = 'dashboard' | 'tasks' | 'projects';

/** The tabs in the top bar, in the order they are shown. */
export const HOME_TABS: readonly { id: HomeTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'projects', label: 'Projects' },
];

const tabIndex = (tab: HomeTab) => HOME_TABS.findIndex((t) => t.id === tab);

/** Reads the `tab` query parameter; anything unknown means the dashboard. */
function asTab(value: string | null): HomeTab {
  return HOME_TABS.find((t) => t.id === value)?.id ?? 'dashboard';
}

// TODO(Sprint 2): move to the Inbox page once it exists.
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    ProjectList,
    PriorityList,
    MiniCalendar,
    StatusColumns,
    AllTasks,
    ProjectsPage,
  ],
  providers: [DashboardStore],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly session = inject(SessionService);
  protected readonly store = inject(DashboardStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loggingOut = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly composing = signal(false);

  protected readonly tabs = HOME_TABS;
  /** The tab on screen. It follows the URL (?tab=…) so refresh and Back keep it. */
  protected readonly tab = signal<HomeTab>('dashboard');
  protected readonly tabIndex = computed(() => tabIndex(this.tab()));
  /** Which side the new panel slides in from; null on first load, so nothing moves. */
  protected readonly slideFrom = signal<'left' | 'right' | null>(null);

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.show(asTab(params.get('tab'))));
  }

  /** Switches tabs in place: only the query parameter changes, so the page is not reloaded. */
  protected select(tab: HomeTab): void {
    if (tab === this.tab()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'dashboard' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

  /** Arrow keys, Home and End move between tabs, as in the ARIA tabs pattern. */
  protected onTabKey(event: KeyboardEvent): void {
    const last = HOME_TABS.length - 1;
    const current = this.tabIndex();
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

  /** "+ New Task" opens the new-task form, which the Projects tab doesn't have. */
  protected newTask(): void {
    if (this.tab() === 'projects') this.select('tasks');
    this.composing.set(true);
  }

  private shown = false;

  private show(tab: HomeTab): void {
    const step = tabIndex(tab) - this.tabIndex();
    // The first tab shown (e.g. after a refresh on ?tab=projects) appears without sliding.
    if (this.shown && step !== 0) this.slideFrom.set(step > 0 ? 'right' : 'left');
    this.shown = true;
    this.tab.set(tab);
  }

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    return hour < 18 ? 'Good Afternoon' : 'Good Evening';
  });

  protected readonly initial = computed(
    () => this.session.currentUser()?.username?.charAt(0).toUpperCase() ?? '',
  );

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.session
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe(() => void this.router.navigateByUrl('/login'));
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TopBar, HOME_TABS, type HomeTab, asTab } from '../../shared/components/top-bar/top-bar';
import { SessionService } from '../auth/session/session.service';
import { ProjectList as ProjectsPage } from '../projects/project-crud/project-list/project-list';
import { ProjectSwitcher } from '../projects/project-organization/project-switcher/project-switcher';
import { AllTasks } from './board/all-tasks';
import { StatusColumns } from './board/status-columns';
import { DashboardStore } from './dashboard.store';
import { MiniCalendar } from './sidebar/mini-calendar';
import { PriorityList } from './sidebar/priority-list';
import { ProjectList } from './sidebar/project-list';

const tabIndex = (tab: HomeTab) => HOME_TABS.findIndex((t) => t.id === tab);

// TODO(Sprint 2): move to the Inbox page once it exists.
@Component({
  selector: 'app-home',
  imports: [
    TopBar,
    ProjectList,
    PriorityList,
    MiniCalendar,
    StatusColumns,
    AllTasks,
    ProjectsPage,
    ProjectSwitcher,
  ],
  providers: [DashboardStore],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly session = inject(SessionService);
  protected readonly store = inject(DashboardStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly composing = signal(false);

  /** The tab on screen. It follows the URL (?tab=…) so refresh and Back keep it. */
  protected readonly tab = signal<HomeTab>('dashboard');
  /** Whether the Projects tab shows the organize view. It follows the URL (?view=organize). */
  protected readonly organizing = signal(false);
  /** Which side the new panel slides in from; null on first load, so nothing moves. */
  protected readonly slideFrom = signal<'left' | 'right' | null>(null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.show(asTab(params.get('tab')));
      this.organizing.set(params.get('view') === 'organize');
    });
  }

  private shown = false;

  private show(tab: HomeTab): void {
    const step = tabIndex(tab) - tabIndex(this.tab());
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
}

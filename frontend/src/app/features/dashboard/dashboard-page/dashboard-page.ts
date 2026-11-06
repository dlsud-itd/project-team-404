import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SessionService } from '../../auth/session/session.service';
import { CurrentUpcomingTasks } from '../current-upcoming-tasks/current-upcoming-tasks';
import { OverdueTasks } from '../overdue-tasks/overdue-tasks';

/** The signed-in user's dashboard at /dashboard. Hosts the Current & Upcoming and Overdue sections. */
@Component({
  selector: 'app-dashboard-page',
  imports: [CurrentUpcomingTasks, OverdueTasks],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly session = inject(SessionService);

  protected readonly username = computed(() => this.session.currentUser()?.username ?? null);
}

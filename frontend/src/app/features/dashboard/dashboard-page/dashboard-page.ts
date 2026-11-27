import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CurrentUpcomingTasks } from '../current-upcoming-tasks/current-upcoming-tasks';
import { OverdueTasks } from '../overdue-tasks/overdue-tasks';
import { StreakPet } from '../streak-pet/streak-pet';
import { StreaksSection } from '../streaks/streaks-section';

/**
 * The signed-in user's dashboard at /dashboard. Hosts the Current & Upcoming, Streaks and Overdue
 * sections.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [StreakPet, CurrentUpcomingTasks, StreaksSection, OverdueTasks],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}

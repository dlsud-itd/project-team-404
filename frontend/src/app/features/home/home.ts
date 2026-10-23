import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionService } from '../auth/session/session.service';
import { AllTasks } from './board/all-tasks';
import { StatusColumns } from './board/status-columns';
import { DashboardStore } from './dashboard.store';
import { MiniCalendar } from './sidebar/mini-calendar';
import { PriorityList } from './sidebar/priority-list';
import { ProjectList } from './sidebar/project-list';

// TODO(Sprint 2): move to the Inbox page once it exists.
@Component({
  selector: 'app-home',
  imports: [RouterLink, ProjectList, PriorityList, MiniCalendar, StatusColumns, AllTasks],
  providers: [DashboardStore],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly session = inject(SessionService);
  protected readonly store = inject(DashboardStore);
  private readonly router = inject(Router);

  protected readonly loggingOut = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly composing = signal(false);

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

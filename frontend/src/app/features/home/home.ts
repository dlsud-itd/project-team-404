import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionService } from '../auth/session/session.service';

// TODO(Sprint 2): replace with the Inbox page.
@Component({
  selector: 'app-home',
  template: `
    <main class="home">
      <h1>Welcome, {{ session.currentUser()?.username }}</h1>
      <p>Your Inbox is coming soon.</p>
      <button type="button" class="logout" [disabled]="loggingOut()" (click)="logout()">
        {{ loggingOut() ? 'Logging out…' : 'Log out' }}
      </button>
    </main>
  `,
  styles: `
    .home {
      max-width: 40rem;
      margin: 0 auto;
      padding: 3rem 1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly loggingOut = signal(false);

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.session
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe(() => void this.router.navigateByUrl('/login'));
  }
}

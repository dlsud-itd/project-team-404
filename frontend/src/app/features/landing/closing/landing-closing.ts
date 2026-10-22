import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-closing',
  imports: [RouterLink],
  template: `
    <section class="closing" aria-labelledby="closing-heading">
      <div class="card">
        <div>
          <h2 id="closing-heading" class="heading">Get your first task done today.</h2>
          <p class="text">
            Create an account, set up a project, and plan your week with deadlines and priorities.
          </p>
        </div>
        <div class="actions">
          <a class="pill pill--dark" routerLink="/register">Create free account</a>
          <a class="pill pill--light" routerLink="/login">I already have an account</a>
        </div>
      </div>
    </section>
  `,
  styleUrl: './landing-closing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingClosing {}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopBar } from '../top-bar/top-bar';

/** Keeps the top bar and page background around the signed-in pages outside the home page. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TopBar],
  template: `
    <app-top-bar />
    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: #fcebe3;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {}

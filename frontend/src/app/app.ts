import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutlet } from './shared/components/toast-outlet/toast-outlet';

@Component({
  imports: [RouterOutlet, ToastOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('frontend');
}

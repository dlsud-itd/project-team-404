import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingClosing } from './closing/landing-closing';
import { LandingFeatures } from './features/landing-features';
import { LandingFooter } from './footer/landing-footer';
import { LandingSteps } from './steps/landing-steps';
import { ThemeSwitcher } from '../../shared/components/theme-switcher/theme-switcher';

/** One row of the hero preview. Priority names match the app's --priority-*-accent tokens. */
interface PreviewTask {
  title: string;
  meta: string;
  priority: 'urgent' | 'medium' | 'low' | 'none';
  done: boolean;
  streak?: number;
  due?: string;
}

interface PreviewDay {
  label: string;
  state: 'done' | 'today' | 'ahead';
}

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    LandingFeatures,
    LandingSteps,
    LandingClosing,
    LandingFooter,
    ThemeSwitcher,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  protected readonly navLinks = [
    { label: 'Features', fragment: 'features' },
    { label: 'How it works', fragment: 'how-it-works' },
    { label: 'About', fragment: 'about' },
  ];

  protected readonly previewTasks: PreviewTask[] = [
    {
      title: 'Morning run',
      meta: 'Personal · Every day',
      priority: 'medium',
      done: true,
      streak: 12,
    },
    { title: 'Read chapter 4', meta: 'Biology', priority: 'low', done: true },
    {
      title: 'Draft capstone outline',
      meta: 'Capstone',
      priority: 'urgent',
      done: false,
      due: 'Due today',
    },
    { title: 'Plan next week', meta: 'Personal · Every Thursday', priority: 'none', done: false },
  ];

  protected readonly previewWeek: PreviewDay[] = [
    { label: 'M', state: 'done' },
    { label: 'T', state: 'done' },
    { label: 'W', state: 'done' },
    { label: 'T', state: 'today' },
    { label: 'F', state: 'ahead' },
    { label: 'S', state: 'ahead' },
    { label: 'S', state: 'ahead' },
  ];
}

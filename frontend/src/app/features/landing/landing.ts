import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingClosing } from './closing/landing-closing';
import { LandingFeatures } from './features/landing-features';
import { LandingFooter } from './footer/landing-footer';
import { LandingSteps } from './steps/landing-steps';

interface Showcase {
  label: string;
  image: string;
  tone: 'purple' | 'peach';
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, LandingFeatures, LandingSteps, LandingClosing, LandingFooter],
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

  /** Illustrations live in public/landing/. */
  protected readonly showcases: Showcase[] = [
    { label: 'Focus', image: 'landing/focus.png', tone: 'purple' },
    { label: 'Routine', image: 'landing/routine.png', tone: 'peach' },
    { label: 'Consistent', image: 'landing/consistent.png', tone: 'purple' },
  ];
}

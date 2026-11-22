import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingClosing } from './closing/landing-closing';
import { LandingFeatures } from './features/landing-features';
import { LandingFooter } from './footer/landing-footer';
import { LandingSteps } from './steps/landing-steps';

interface Showcase {
  label: string;
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

  protected readonly showcases: Showcase[] = [
    { label: 'Focus', tone: 'purple' },
    { label: 'Routine', tone: 'peach' },
    { label: 'Consistent', tone: 'purple' },
  ];
}

import { ChangeDetectionStrategy, Component } from '@angular/core';

interface FeatureGroup {
  title: string;
  description: string;
  items: string[];
}

@Component({
  selector: 'app-landing-features',
  templateUrl: './landing-features.html',
  styleUrl: './landing-features.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFeatures {
  protected readonly groups: FeatureGroup[] = [
    {
      title: 'Task management',
      description: 'The basics, done well: capture, clear and see everything on your plate.',
      items: ['Add tasks', 'Delete tasks', 'Task list'],
    },
    {
      title: 'Scheduling and organization',
      description: 'Give every task a when, a why-now and a where-it-fits.',
      items: ['Dates and deadlines', 'Priority levels', 'Labels', 'Recurring tasks'],
    },
    {
      title: 'Projects and dashboard',
      description: 'Organize by responsibility, then see what matters the moment you log in.',
      items: ['Create projects', 'Project list', 'Task dashboard'],
    },
    {
      title: 'Account and security',
      description: 'Your tasks stay yours, with a sign-in flow that helps instead of blocks.',
      items: ['Easy sign-up', 'Helpful error messages', 'Secure login', 'Forgot password'],
    },
  ];
}

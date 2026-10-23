import { ChangeDetectionStrategy, Component } from '@angular/core';

interface FeatureGroup {
  title: string;
  description: string;
  tone: 'orange' | 'purple';
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
      title: 'Task Management',
      description: 'The basics, done well: capture, clear and see everything on your plate.',
      tone: 'orange',
      items: ['Add Tasks', 'Delete Tasks', 'Tasks List'],
    },
    {
      title: 'Scheduling & Organization',
      description: 'Give every task a when, a why-now and a where-it-fits.',
      tone: 'purple',
      items: ['Dates & Deadlines', 'Priority Levels', 'Labels', 'Recurring Tasks'],
    },
    {
      title: 'Projects & Dashboard',
      description: 'Organize by responsibility, then see what matters the moment you log in.',
      tone: 'orange',
      items: ['Create Projects', 'Project List', 'Task Dashboard'],
    },
    {
      title: 'Account & Security',
      description: 'Your tasks stay yours, with a sign-in flow that helps instead of blocks.',
      tone: 'purple',
      items: ['Easy sign-up', 'Helpful error messages', 'Secure login', 'Forgot password'],
    },
  ];
}

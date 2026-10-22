import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Step {
  number: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-landing-steps',
  templateUrl: './landing-steps.html',
  styleUrl: './landing-steps.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingSteps {
  protected readonly steps: Step[] = [
    {
      number: '01',
      title: 'Create your account',
      description:
        'Sign up with your name, email and password, then log in securely. Forgot your password? Reset it anytime.',
    },
    {
      number: '02',
      title: 'Set up your projects',
      description:
        'Create a project for each class, job or responsibility so every task has a home.',
    },
    {
      number: '03',
      title: 'Add and organize tasks',
      description:
        'Give tasks dates, deadlines, a priority and labels. Set routines to repeat automatically.',
    },
    {
      number: '04',
      title: 'Check your dashboard',
      description:
        "See what's current, upcoming and overdue, then tackle the most important work first.",
    },
  ];
}

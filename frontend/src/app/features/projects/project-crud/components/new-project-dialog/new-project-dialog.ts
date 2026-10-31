import { CdkTrapFocus } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  type OnDestroy,
  afterNextRender,
  inject,
} from '@angular/core';
import { ProjectsStore } from '../../../shared/state/projects.store';
import { ProjectForm } from '../../project-form/project-form';

/**
 * The new-project form as a popup, shown while ProjectsStore.creating is true. Clicking outside
 * does nothing, so a stray click can't lose what was typed; Cancel and Escape close it.
 */
@Component({
  selector: 'app-new-project-dialog',
  imports: [CdkTrapFocus, ProjectForm],
  template: `
    <div class="backdrop"></div>
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      cdkTrapFocus
    >
      <app-project-form [dialog]="true" (closed)="store.creating.set(false)" />
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 1rem;
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgb(29 23 20 / 0.45);
    }
    .dialog {
      position: relative;
      box-sizing: border-box;
      width: min(32rem, 100%);
      max-height: calc(100dvh - 2rem);
      padding: 1.5rem;
      overflow-y: auto;
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 20px 48px rgb(0 0 0 / 0.2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewProjectDialog implements OnDestroy {
  protected readonly store = inject(ProjectsStore);
  /** What had focus when the popup opened, so closing can hand it back. */
  private readonly opener = inject(DOCUMENT).activeElement as HTMLElement | null;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => host.querySelector<HTMLElement>('#project-name')?.focus());
  }

  ngOnDestroy(): void {
    this.store.creating.set(false);
    this.opener?.focus();
  }
}

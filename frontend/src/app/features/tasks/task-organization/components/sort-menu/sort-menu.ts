import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { SortDirection } from '../../types/task-query.types';

export interface SortOption {
  /** The first option is the list's natural order, which has no direction. */
  value: string;
  label: string;
}

export interface SortChange {
  value: string;
  direction: SortDirection;
}

/**
 * "Sort: Due date" button that opens a menu of sort fields, plus a toggle for the direction.
 * Built on the CDK menu, which gives arrow-key navigation, Escape and the menu roles.
 */
@Component({
  selector: 'app-sort-menu',
  imports: [CdkMenuTrigger, CdkMenu, CdkMenuItemRadio],
  templateUrl: './sort-menu.html',
  styleUrl: './sort-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SortMenu {
  readonly options = input.required<readonly SortOption[]>();
  readonly value = input.required<string>();
  readonly direction = input<SortDirection>('asc');
  /** Names the menu for screen readers, e.g. "Sort tasks". */
  readonly label = input('Sort');
  readonly changed = output<SortChange>();

  protected readonly current = computed(
    () => this.options().find((option) => option.value === this.value()) ?? this.options()[0],
  );
  /** The natural order has no direction to flip. */
  protected readonly hasDirection = computed(() => this.current() !== this.options()[0]);

  protected select(value: string): void {
    if (value === this.value()) return;
    this.changed.emit({ value, direction: this.direction() });
  }

  protected flip(): void {
    this.changed.emit({
      value: this.value(),
      direction: this.direction() === 'asc' ? 'desc' : 'asc',
    });
  }
}

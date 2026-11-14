import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { PriorityLevel } from '../../../../settings/types/settings.types';
import { formatDate } from '../../../task-scheduling/utils/date-format.util';
import type { Label } from '../../services/label.service';
import type { DuePreset, TaskQuery, TaskStatusFilter } from '../../types/task-query.types';
import { activeFilterCount, hasInvalidRange } from '../../utils/task-query-params.util';

type Panel = 'priority' | 'labels' | 'due' | 'repeat' | 'status';

export const DUE_OPTIONS: readonly { value: DuePreset | null; label: string }[] = [
  { value: null, label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'next7', label: 'Next 7 days' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'none', label: 'No date' },
  { value: 'custom', label: 'Custom range…' },
];
const REPEAT_OPTIONS: readonly { value: boolean | null; label: string }[] = [
  { value: null, label: 'Any' },
  { value: true, label: 'Repeating' },
  { value: false, label: 'One-time' },
];
const STATUS_OPTIONS: readonly { value: TaskStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

/**
 * The task list's filter chips. Each chip opens a small panel of native checkboxes or radios
 * (a disclosure, so screen readers announce it as expanded and every option is a real form
 * control). The bar only reports changes; TaskQueryStore applies them.
 */
@Component({
  selector: 'app-task-filter-bar',
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeIfOutside($event)',
  },
})
export class TaskFilterBar {
  readonly query = input.required<TaskQuery>();
  readonly levels = input<readonly PriorityLevel[]>([]);
  readonly labels = input<readonly Label[]>([]);
  readonly changed = output<Partial<TaskQuery>>();
  readonly cleared = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly dueFrom = viewChild<ElementRef<HTMLInputElement>>('dueFrom');

  protected readonly dueOptions = DUE_OPTIONS;
  protected readonly repeatOptions = REPEAT_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly open = signal<Panel | null>(null);
  protected readonly count = computed(() => activeFilterCount(this.query()));
  protected readonly invalidRange = computed(() => hasInvalidRange(this.query()));
  protected readonly announcement = computed(() => {
    const count = this.count();
    if (count === 0) return 'No filters applied';
    return `${count} ${count === 1 ? 'filter' : 'filters'} applied`;
  });

  protected readonly priorityText = computed(() => {
    const picked = new Set(this.query().priorities);
    const names = this.levels()
      .filter((level) => picked.has(level.name.toLowerCase()))
      .map((level) => level.name);
    return summary('Priority', names.length ? names : [...picked]);
  });
  protected readonly labelsText = computed(() => {
    const { labelIds, labelMatch } = this.query();
    const names = labelIds.map(
      (id) => this.labels().find((label) => label.labelId === id)?.name ?? `#${id}`,
    );
    const prefix = labelMatch === 'all' && labelIds.length > 1 ? 'Labels (all)' : 'Labels';
    return summary(prefix, names);
  });
  protected readonly dueText = computed(() => {
    const { due, dueFrom, dueTo } = this.query();
    if (due === null) return 'Due';
    if (due !== 'custom') return `Due: ${DUE_OPTIONS.find((o) => o.value === due)?.label}`;
    if (dueFrom && dueTo) return `Due: ${formatDate(dueFrom)} – ${formatDate(dueTo)}`;
    if (dueFrom) return `Due: from ${formatDate(dueFrom)}`;
    if (dueTo) return `Due: until ${formatDate(dueTo)}`;
    return 'Due: Custom';
  });
  protected readonly repeatText = computed(() => {
    const { recurring } = this.query();
    return recurring === null ? 'Repeat' : recurring ? 'Repeating' : 'One-time';
  });
  protected readonly statusText = computed(() => {
    const { status } = this.query();
    return status === 'all' ? 'Status' : `Status: ${status === 'active' ? 'Active' : 'Completed'}`;
  });

  protected toggle(panel: Panel): void {
    this.open.update((current) => (current === panel ? null : panel));
  }

  /** Escape closes the open panel and puts focus back on its chip. */
  protected closeAndFocus(chip: HTMLElement): void {
    if (this.open() === null) return;
    this.open.set(null);
    chip.focus();
  }

  /** Closes the panel once focus moves somewhere outside its chip. */
  protected onFocusOut(event: FocusEvent, wrap: HTMLElement): void {
    const next = event.relatedTarget;
    if (next instanceof Node && wrap.contains(next)) return;
    if (next instanceof Node) this.open.set(null);
  }

  /** A click anywhere outside the bar closes the panel; clicks inside are handled there. */
  protected closeIfOutside(event: Event): void {
    if (this.open() === null) return;
    const target = event.target;
    if (target instanceof Node && this.host.nativeElement.contains(target)) return;
    this.open.set(null);
  }

  protected isPriority(level: PriorityLevel): boolean {
    return this.query().priorities.includes(level.name.toLowerCase());
  }

  protected togglePriority(level: PriorityLevel): void {
    const name = level.name.toLowerCase();
    const current = this.query().priorities;
    this.changed.emit({
      priorities: current.includes(name) ? current.filter((p) => p !== name) : [...current, name],
    });
  }

  protected toggleLabel(labelId: number): void {
    const current = this.query().labelIds;
    this.changed.emit({
      labelIds: current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId],
    });
  }

  protected setLabelMatch(labelMatch: 'any' | 'all'): void {
    this.changed.emit({ labelMatch });
  }

  protected setDue(due: DuePreset | null): void {
    this.changed.emit({ due });
    if (due === 'custom') {
      // The range fields sit under the chips; move straight to the first one.
      this.open.set(null);
      afterNextRender(() => this.dueFrom()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  protected setRange(bound: 'dueFrom' | 'dueTo', event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.changed.emit({ due: 'custom', [bound]: target.value || null });
  }

  protected setRecurring(recurring: boolean | null): void {
    this.changed.emit({ recurring });
  }

  protected setStatus(status: TaskStatusFilter): void {
    this.changed.emit({ status });
  }

  protected clear(): void {
    this.open.set(null);
    this.cleared.emit();
  }
}

/** "Priority", "Priority: High, Low" or "Priority: High +2". */
function summary(prefix: string, names: readonly string[]): string {
  if (!names.length) return prefix;
  if (names.length <= 2) return `${prefix}: ${names.join(', ')}`;
  return `${prefix}: ${names[0]} +${names.length - 1}`;
}

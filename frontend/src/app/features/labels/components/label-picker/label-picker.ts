import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import type { Label } from '../../types/label.types';
import { LabelChip } from '../label-chip/label-chip';

let nextId = 0;

/**
 * Picks any number of labels. The chosen ids are a two-way `selected` binding; the picker never
 * calls the API, so the parent decides when to save.
 */
@Component({
  selector: 'app-label-picker',
  imports: [LabelChip],
  template: `
    <fieldset class="picker" [disabled]="disabled()">
      <legend>{{ legend() }}</legend>

      @if (chosen().length) {
        <ul class="chosen" aria-label="Chosen labels">
          @for (label of chosen(); track label.labelId) {
            <li>
              <app-label-chip
                [label]="label"
                [removable]="true"
                [disabled]="disabled()"
                (removed)="toggle($event.labelId)"
              />
            </li>
          }
        </ul>
      }

      @if (labels().length) {
        <label class="visually-hidden" [for]="searchId">Search labels</label>
        <input
          [id]="searchId"
          class="search"
          type="search"
          autocomplete="off"
          placeholder="Search labels"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />

        @if (options().length) {
          <ul class="options">
            @for (label of options(); track label.labelId) {
              <li>
                <label class="option">
                  <input
                    type="checkbox"
                    [checked]="isSelected(label.labelId)"
                    [attr.data-label-id]="label.labelId"
                    (change)="toggle(label.labelId)"
                  />
                  <span
                    class="dot"
                    [class.none]="!label.color"
                    [style.background]="label.color ?? null"
                    aria-hidden="true"
                  ></span>
                  {{ label.name }}
                </label>
              </li>
            }
          </ul>
        } @else {
          <p class="empty">No labels match “{{ query().trim() }}”.</p>
        }
      } @else {
        <p class="empty">You have no labels yet.</p>
      }
    </fieldset>
  `,
  styles: `
    :host {
      display: block;
    }
    .picker {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }
    legend {
      margin-bottom: 0.375rem;
      padding: 0;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .chosen,
    .options {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .chosen {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }
    .search {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--field-border);
      border-radius: 0.5rem;
      font: inherit;
      font-size: 0.875rem;
    }
    .options {
      max-height: 12rem;
      margin-top: 0.375rem;
      overflow-y: auto;
    }
    .option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.125rem;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .dot {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
    }
    .dot.none {
      border: 1px solid var(--ink-muted);
    }
    .empty {
      margin: 0.375rem 0 0;
      color: var(--ink-muted);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelPicker {
  /** The labels to choose from, in the order to show them. */
  readonly labels = input.required<readonly Label[]>();
  /** Ids of the chosen labels. */
  readonly selected = model<readonly number[]>([]);
  readonly disabled = input(false);
  readonly legend = input('Labels');

  protected readonly searchId = `label-picker-search-${nextId++}`;
  protected readonly query = signal('');

  /** Chosen labels in the order they were chosen; ids with no matching label are skipped. */
  protected readonly chosen = computed(() => {
    const byId = new Map(this.labels().map((l) => [l.labelId, l]));
    return this.selected()
      .map((id) => byId.get(id))
      .filter((l): l is Label => l !== undefined);
  });

  /** Labels whose name contains the search text, ignoring case. */
  protected readonly options = computed(() => {
    const query = this.query().trim().toLowerCase();
    return query
      ? this.labels().filter((l) => l.name.toLowerCase().includes(query))
      : this.labels();
  });

  protected isSelected(labelId: number): boolean {
    return this.selected().includes(labelId);
  }

  protected toggle(labelId: number): void {
    if (this.disabled()) return;
    this.selected.update((ids) =>
      ids.includes(labelId) ? ids.filter((id) => id !== labelId) : [...ids, labelId],
    );
  }
}

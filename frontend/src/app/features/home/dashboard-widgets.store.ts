import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** The dashboard widgets whose contents can be folded away. */
export type DashboardWidget = 'current' | 'upcoming' | 'overdue' | 'all-tasks';

const WIDGETS: readonly DashboardWidget[] = ['current', 'upcoming', 'overdue', 'all-tasks'];

/** localStorage key for the collapsed widgets, saved as a JSON array of widget ids. */
export const DASHBOARD_COLLAPSED_KEY = 'habitflow.dashboard.collapsed';

/**
 * Which dashboard widgets are collapsed, remembered in this browser. Blocked or full storage
 * just means every widget starts expanded.
 */
@Injectable({ providedIn: 'root' })
export class DashboardWidgetsStore {
  private readonly storage = storageOf(inject(DOCUMENT));
  private readonly collapsed = signal<ReadonlySet<DashboardWidget>>(this.read());

  isCollapsed(widget: DashboardWidget): boolean {
    return this.collapsed().has(widget);
  }

  toggle(widget: DashboardWidget): void {
    const next = new Set(this.collapsed());
    if (!next.delete(widget)) next.add(widget);
    this.collapsed.set(next);
    try {
      this.storage?.setItem(DASHBOARD_COLLAPSED_KEY, JSON.stringify([...next]));
    } catch {
      // Full or blocked storage: the choice lasts until the page reloads.
    }
  }

  private read(): ReadonlySet<DashboardWidget> {
    try {
      const saved: unknown = JSON.parse(this.storage?.getItem(DASHBOARD_COLLAPSED_KEY) ?? '[]');
      if (!Array.isArray(saved)) return new Set();
      return new Set(WIDGETS.filter((widget) => saved.includes(widget)));
    } catch {
      return new Set();
    }
  }
}

/** Reading window.localStorage itself throws when site data is blocked. */
function storageOf(document: Document): Storage | null {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

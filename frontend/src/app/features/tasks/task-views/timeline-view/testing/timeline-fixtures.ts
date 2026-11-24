import type { ApiTimeline, ApiTimelineBar, ApiTimelineGroup } from '../types/task-timeline.types';

/** A bar in project 10, "Launch", unless overridden. */
export function timelineBar(
  id: number,
  title: string,
  start: string,
  end = start,
  overrides: Partial<ApiTimelineBar> = {},
): ApiTimelineBar {
  return {
    id,
    title,
    projectId: 10,
    projectName: 'Launch',
    projectColor: '#2f7d6d',
    start,
    end,
    isDone: false,
    isOverdue: false,
    priority: 'medium',
    ...overrides,
  };
}

/** A pointer event where the test DOM has them, otherwise the mouse event they extend. */
export function pointer(type: string, clientX: number, button = 0): Event {
  const init = { bubbles: true, cancelable: true, clientX, button, pointerId: 1 };
  return typeof PointerEvent === 'function'
    ? new PointerEvent(type, init)
    : new MouseEvent(type, init);
}

/** Groups bars by project the way the server does, in first-seen order. */
export function apiTimeline(
  from: string,
  to: string,
  bars: ApiTimelineBar[],
  undatedCount = 0,
): ApiTimeline {
  const groups = new Map<string, ApiTimelineGroup>();
  for (const bar of bars) {
    const key = String(bar.projectId);
    const group = groups.get(key) ?? {
      projectId: bar.projectId,
      projectName: bar.projectName,
      projectColor: bar.projectColor,
      bars: [],
    };
    group.bars.push(bar);
    groups.set(key, group);
  }
  return { from, to, projects: [...groups.values()], undatedCount };
}

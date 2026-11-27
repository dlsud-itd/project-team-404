/** How a priority level colors a task: a soft background tint and a solid left accent. */
export interface PriorityTone {
  /** The level's name, for tooltips and screen readers. */
  name: string;
  /** CSS color for the tint behind the task. */
  bg: string;
  /** CSS color for the accent on the task's left edge. */
  accent: string;
}

type StandardTone = 'urgent' | 'high' | 'medium' | 'low' | 'none';

/**
 * Level names that map onto the app's fixed palette (see the --priority-* tokens in
 * styles.scss). Any other name is a custom level and uses its own color.
 */
const STANDARD_NAMES: Readonly<Record<string, StandardTone>> = {
  urgent: 'urgent',
  high: 'high',
  critical: 'urgent',
  medium: 'medium',
  normal: 'medium',
  low: 'low',
  none: 'none',
  'no priority': 'none',
};

const HEX = /^#[\da-f]{6}$/i;

function standard(tone: StandardTone, name: string): PriorityTone {
  return { name, bg: `var(--priority-${tone}-bg)`, accent: `var(--priority-${tone}-accent)` };
}

/**
 * The tone for a level. Urgent, High, Medium, Low and None use the shared palette whatever color
 * the level was given, so the same priority always looks the same; custom levels tint with their
 * own color the same way.
 */
export function priorityTone(level: { name: string; color: string | null } | undefined): PriorityTone {
  if (!level) return standard('none', 'No priority');
  const preset = STANDARD_NAMES[level.name.trim().toLowerCase()];
  if (preset) return standard(preset, level.name);
  if (!level.color || !HEX.test(level.color)) return standard('none', level.name);
  return {
    name: level.name,
    bg: `color-mix(in srgb, ${level.color} 12%, transparent)`,
    accent: level.color,
  };
}

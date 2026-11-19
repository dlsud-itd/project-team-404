export type TaskSpanSource = {
  scheduledDate: Date | null;
  dueDate: Date | null;
  deadline: Date | null;
};

export type TaskSpan = { start: string; end: string };

export function getTaskSpan(
  task: TaskSpanSource,
  timeZone: string
): TaskSpan | null {
  const start = task.scheduledDate ?? task.dueDate;
  if (!start) return null;

  const startDate = dateOnly(start);
  const deadlineDate = task.deadline
    ? dateInTimeZone(task.deadline, timeZone)
    : null;
  const endDate =
    deadlineDate ?? (task.dueDate ? dateOnly(task.dueDate) : startDate);

  return {
    start: startDate,
    end: endDate < startDate ? startDate : endDate,
  };
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dateInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  if (!year || !month || !day) {
    throw new Error(
      `Could not determine deadline date in timezone ${timeZone}`
    );
  }
  return `${year}-${month}-${day}`;
}

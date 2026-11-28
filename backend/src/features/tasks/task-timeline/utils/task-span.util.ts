export type TaskSpanSource = {
  scheduledDate: Date | null;
  dueDate: Date | null;
};

export type TaskSpan = { start: string; end: string };

/** A task runs from its start date to its end date; either one alone makes a one-day span. */
export function getTaskSpan(task: TaskSpanSource): TaskSpan | null {
  const start = task.scheduledDate ?? task.dueDate;
  if (!start) return null;

  const startDate = dateOnly(start);
  const endDate = task.dueDate ? dateOnly(task.dueDate) : startDate;

  return {
    start: startDate,
    end: endDate < startDate ? startDate : endDate,
  };
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

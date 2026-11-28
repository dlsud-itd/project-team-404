/** How late an overdue task is, in whole calendar days in the user's timezone. */
export interface OverdueDuration {
  /** 0 when the task ends today, so it is not late yet. */
  days: number;
  /** "Due today", "1 day overdue" or "3 days overdue". */
  label: string;
}

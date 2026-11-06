/** How late an overdue task is, in whole calendar days in the user's timezone. */
export interface OverdueDuration {
  /** 0 when the deadline passed earlier today. */
  days: number;
  /** "Due earlier today", "1 day overdue" or "3 days overdue". */
  label: string;
}

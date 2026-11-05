export type RecurrenceRuleInput = {
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  recurrenceDays?: number[];
  recurrenceEndDate?: string | null;
};

/**
 * The columns to write for a recurrence change. Fields left out are left alone, except that
 * leaving weekly clears the weekdays and turning repeats off also clears the end date.
 */
export function toRecurrenceData(input: RecurrenceRuleInput) {
  const { recurrence, recurrenceDays, recurrenceEndDate } = input;
  const data: {
    recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
    recurrenceDays?: number[];
    recurrenceEndDate?: Date | null;
  } = {};

  if (recurrence !== undefined) data.recurrence = recurrence ?? 'none';
  if (recurrenceDays !== undefined) data.recurrenceDays = recurrenceDays;
  if (recurrenceEndDate !== undefined) {
    data.recurrenceEndDate = recurrenceEndDate
      ? new Date(`${recurrenceEndDate}T00:00:00.000Z`)
      : null;
  }

  if (recurrence !== undefined && recurrence !== 'weekly')
    data.recurrenceDays = [];
  if (recurrence !== undefined && (recurrence ?? 'none') === 'none') {
    data.recurrenceEndDate = null;
  }
  return data;
}

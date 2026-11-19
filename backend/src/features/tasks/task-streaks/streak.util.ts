export function localDateString(timezone: string, date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function longestConsecutiveDates(
  dates: string[],
  recurrence: 'daily' | 'weekly' | 'monthly' | 'none'
) {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < unique.length; index++) {
    const previous = unique[index - 1]!;
    const next = unique[index]!;
    const consecutive =
      recurrence === 'weekly'
        ? diffDays(previous, next) === 7
        : recurrence === 'monthly'
          ? diffMonths(previous, next) === 1
          : diffDays(previous, next) === 1;
    if (consecutive) current++;
    else current = 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function diffDays(left: string, right: string) {
  return Math.round(
    (Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) /
      86_400_000
  );
}

function diffMonths(left: string, right: string) {
  const a = left.slice(0, 7).split('-').map(Number);
  const b = right.slice(0, 7).split('-').map(Number);
  return (b[0]! - a[0]!) * 12 + b[1]! - a[1]!;
}

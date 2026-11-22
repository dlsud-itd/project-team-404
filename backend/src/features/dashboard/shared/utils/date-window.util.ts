export type DateWindow = {
  startDate: string;
  endDate: string;
};

export function getDateWindow(
  timeZone: string,
  days: number,
  now: Date = new Date()
): DateWindow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  if (!year || !month || !day) {
    throw new Error(`Could not determine local date for timezone ${timeZone}`);
  }

  const startDate = `${year}-${month}-${day}`;
  const numericYear = Number(startDate.slice(0, 4));
  const numericMonth = Number(startDate.slice(5, 7));
  const numericDay = Number(startDate.slice(8, 10));
  const endDate = new Date(
    Date.UTC(numericYear, numericMonth - 1, numericDay + days)
  )
    .toISOString()
    .slice(0, 10);

  return { startDate, endDate };
}

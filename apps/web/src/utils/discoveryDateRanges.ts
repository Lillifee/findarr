type DateUnit = 'day' | 'month' | 'year';

type DateRangePreset = { id: number; label: string } & (
  | { direction: 'last' | 'next'; amount: number; unit: DateUnit }
  | { decade: number }
);

export const next30Days: DateRangePreset = {
  id: 1,
  label: 'catalog.next30Days',
  direction: 'next',
  amount: 30,
  unit: 'day',
};

export const last3Months: DateRangePreset = {
  id: 2,
  label: 'catalog.last3Months',
  direction: 'last',
  amount: 3,
  unit: 'month',
};

const lastYear: DateRangePreset = {
  id: 3,
  label: 'catalog.lastYear',
  direction: 'last',
  amount: 1,
  unit: 'year',
};

const last3Years: DateRangePreset = {
  id: 4,
  label: 'catalog.last3Years',
  direction: 'last',
  amount: 3,
  unit: 'year',
};

const last5Years: DateRangePreset = {
  id: 5,
  label: 'catalog.last5Years',
  direction: 'last',
  amount: 5,
  unit: 'year',
};

const decade2020s: DateRangePreset = { id: 6, label: 'catalog.2020s', decade: 2020 };
const decade2010s: DateRangePreset = { id: 7, label: 'catalog.2010s', decade: 2010 };
const decade2000s: DateRangePreset = { id: 8, label: 'catalog.2000s', decade: 2000 };
const decade1990s: DateRangePreset = { id: 9, label: 'catalog.1990s', decade: 1990 };
const decade1980s: DateRangePreset = { id: 10, label: 'catalog.1980s', decade: 1980 };

export const discoveryDateRanges: readonly DateRangePreset[] = [
  next30Days,
  last3Months,
  lastYear,
  last3Years,
  last5Years,
  decade2020s,
  decade2010s,
  decade2000s,
  decade1990s,
  decade1980s,
];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

function shiftDate(date: Date, amount: number, unit: DateUnit): Date {
  const shifted = new Date(date);
  if (unit === 'day') {
    shifted.setUTCDate(date.getUTCDate() + amount);
  } else {
    // Clamp to the target month's last day instead of overflowing into the next month.
    const months = unit === 'year' ? amount * 12 : amount;
    shifted.setUTCMonth(date.getUTCMonth() + months + 1, 0);
    shifted.setUTCDate(Math.min(date.getUTCDate(), shifted.getUTCDate()));
  }
  return shifted;
}

export function getDiscoveryDateRange(
  id: number,
  today = new Date(),
): { startDate: string; endDate: string } | null {
  const range = discoveryDateRanges.find((preset) => preset.id === id);
  if (!range) {
    return null;
  }
  if ('decade' in range) {
    const start = new Date(Date.UTC(range.decade, 0, 1));
    const end = new Date(Date.UTC(range.decade + 10, 0, 0));
    return { startDate: formatDate(start), endDate: formatDate(end < today ? end : today) };
  }

  if (range.direction === 'last') {
    return {
      startDate: formatDate(shiftDate(today, -range.amount, range.unit)),
      endDate: formatDate(today),
    };
  }
  return {
    startDate: formatDate(shiftDate(today, 1, 'day')),
    endDate: formatDate(shiftDate(today, range.amount, range.unit)),
  };
}

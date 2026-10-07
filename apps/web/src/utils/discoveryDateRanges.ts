interface RollingDatePreset {
  id: number;
  label: string;
  yearsAgo: number;
}

interface DecadeDatePreset {
  id: number;
  label: string;
  startYear: number;
}

export const discoveryDateRanges = [
  { id: 1, label: 'catalog.lastYear', yearsAgo: 1 },
  { id: 2, label: 'catalog.last3Years', yearsAgo: 3 },
  { id: 3, label: 'catalog.last5Years', yearsAgo: 5 },
  { id: 4, label: 'catalog.2020s', startYear: 2020 },
  { id: 5, label: 'catalog.2010s', startYear: 2010 },
  { id: 6, label: 'catalog.2000s', startYear: 2000 },
  { id: 7, label: 'catalog.1990s', startYear: 1990 },
  { id: 8, label: 'catalog.1980s', startYear: 1980 },
] as const satisfies readonly (RollingDatePreset | DecadeDatePreset)[];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export function getDiscoveryDateRange(
  id: number,
  today = new Date(),
): { startDate: string; endDate: string } | null {
  const preset = discoveryDateRanges.find((item) => item.id === id);
  if (!preset) {
    return null;
  }

  if ('yearsAgo' in preset) {
    const startDate = new Date(today);
    startDate.setUTCFullYear(startDate.getUTCFullYear() - preset.yearsAgo);
    return { startDate: formatDate(startDate), endDate: formatDate(today) };
  }

  const startDate = new Date(Date.UTC(preset.startYear, 0, 1));
  const decadeEnd = new Date(Date.UTC(preset.startYear + 10, 0, 0));
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(decadeEnd < today ? decadeEnd : today),
  };
}

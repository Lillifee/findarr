import type { DiscoveryFilter } from '@findarr/shared/catalog';

import {
  addDiscoveryFilter,
  buildCatalogSearchParams,
  readCatalogSearchParams,
} from './catalogSearchParams';
import { getDiscoveryDateRange } from './discoveryDateRanges';

describe('catalog discovery search params', () => {
  it('round-trips numeric date tags with other discovery tags', () => {
    const discovery: DiscoveryFilter[] = [
      { type: 'genre', id: 28, name: 'Action' },
      { type: 'date', id: 4, name: '2020s' },
    ];

    const params = buildCatalogSearchParams({ type: 'movie', discovery });
    const parsed = readCatalogSearchParams(params, { type: 'movie' });

    expect(params.getAll('date')).toStrictEqual(['4']);
    expect(parsed.discovery).toStrictEqual(discovery);
  });

  it('replaces the selected date tag and keeps other filters', () => {
    const discovery: DiscoveryFilter[] = [
      { type: 'genre', id: 28, name: 'Action' },
      { type: 'date', id: 7, name: '1990s' },
    ];

    expect(addDiscoveryFilter(discovery, { type: 'date', id: 6, name: '2000s' })).toStrictEqual([
      { type: 'genre', id: 28, name: 'Action' },
      { type: 'date', id: 6, name: '2000s' },
    ]);
  });

  it('resolves date tag IDs to explicit ISO bounds in the frontend', () => {
    const today = new Date('2026-10-06T00:00:00.000Z');

    expect(getDiscoveryDateRange(2, today)).toStrictEqual({
      startDate: '2023-10-06',
      endDate: '2026-10-06',
    });
    expect(getDiscoveryDateRange(5, today)).toStrictEqual({
      startDate: '2010-01-01',
      endDate: '2019-12-31',
    });
    expect(getDiscoveryDateRange(99, today)).toBeNull();
  });
});

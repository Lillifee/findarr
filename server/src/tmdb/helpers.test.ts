import { regionGroupKeys } from '@findarr/shared';
import { describe, it, expect } from 'vitest';
import {
  buildRegionFilters,
  buildGenreFilter,
  getDateRangeFromDays,
  buildDateParams,
  buildDiscoverParams,
} from './helpers.js';

describe('tmdb/helpers', () => {
  describe('buildRegionFilters', () => {
    it('should return empty filters if no regions selected', () => {
      const result = buildRegionFilters([]);
      expect(result).toEqual({ languageFilter: '', countryFilter: '' });
    });

    it('should return empty filters when all region groups selected', () => {
      const result = buildRegionFilters([...regionGroupKeys]);
      expect(result.languageFilter).toBe('');
      expect(result.countryFilter).toBe('');
    });

    it('should build correct filters for selected region groups', () => {
      const result = buildRegionFilters(['western', 'eastern-europe']);
      expect(result.languageFilter).toBe(
        'en|de|fr|es|it|nl|pt|da|sv|no|fi|is|pl|cs|sk|hu|ro|bg|hr|sl|ru|uk|lv|lt|et'
      );
      expect(result.countryFilter).toBe(
        'US|GB|CA|AU|NZ|IE|ZA|DE|FR|ES|IT|NL|PT|BE|AT|CH|LU|DK|SE|NO|FI|IS|PL|CZ|SK|HU|RO|BG|HR|SI|RU|UA|BY|MD|LV|LT|EE'
      );
    });
  });

  describe('buildGenreFilter', () => {
    it('should return empty string when undefined', () => {
      expect(buildGenreFilter(undefined)).toBe('');
    });

    it('should return empty string when empty array', () => {
      expect(buildGenreFilter([])).toBe('');
    });

    it('should build correct genre filter string', () => {
      const result = buildGenreFilter(['Action', 'Crime']);
      expect(result).toBe('28|10759|80');
    });

    it('should handle genre keys with undefined ids', () => {
      // @ts-expect-error - testing invalid genre key
      const result = buildGenreFilter(['InvalidGenre']);
      expect(result).toBe('');
    });
  });

  describe('getDateRangeFromDays', () => {
    it('should return valid past and future dates', () => {
      const { pastDate, futureDate } = getDateRangeFromDays(7);

      expect(pastDate).toBeInstanceOf(Date);
      expect(futureDate).toBeInstanceOf(Date);
      expect(futureDate.getTime()).toBeGreaterThan(pastDate.getTime());
    });
  });

  describe('buildDateParams', () => {
    it('should return empty object if no recentDays', () => {
      expect(buildDateParams(undefined, 'movie')).toEqual({});
    });

    it('should build movie date params', () => {
      const result = buildDateParams(7, 'movie');
      expect(result['primary_release_date.gte']).toBeDefined();
      expect(result['primary_release_date.lte']).toBeDefined();
    });

    it('should build tv date params', () => {
      const result = buildDateParams(7, 'tv');
      expect(result['air_date.gte']).toBeDefined();
      expect(result['air_date.lte']).toBeDefined();
    });

    it('should build both date params', () => {
      const result = buildDateParams(7, 'both');
      expect(result['primary_release_date.gte']).toBeDefined();
      expect(result['air_date.gte']).toBeDefined();
    });
  });

  describe('buildDiscoverParams', () => {
    it('should build discover params with defaults', () => {
      const result = buildDiscoverParams({});
      expect(result.language).toBe('en-US');
      expect(result.region).toBe('US');
      expect(result.watch_region).toBe('US');
      expect(result.page).toBe(1);
    });

    it('should extract region from language', () => {
      const result = buildDiscoverParams({ language: 'de-DE' });
      expect(result.region).toBe('DE');
    });

    it('should fallback to US region from invalid language', () => {
      const result = buildDiscoverParams({ language: 'UNKNOWN' });
      expect(result.region).toBe('US');
    });

    it('should fallback to US region from language with trailing dash', () => {
      const result = buildDiscoverParams({ language: 'UNKNOWN-' });
      expect(result.region).toBe('US');
    });

    it('should add date params when recentDays provided', () => {
      const result = buildDiscoverParams({ recentDays: 7 });
      expect(result['primary_release_date.gte']).toBeDefined();
    });

    it('should add genre filter when withGenres provided', () => {
      const result = buildDiscoverParams({ withGenres: ['Action', 'Comedy'] });
      expect(result.with_genres).toBe('28|10759|35');
    });

    it('should add region filters when regionGroups provided', () => {
      const result = buildDiscoverParams({ regionGroups: ['western'] });
      expect(result.with_original_language).toBe('en|de|fr|es|it|nl|pt|da|sv|no|fi|is');
      expect(result.with_origin_country).toBe(
        'US|GB|CA|AU|NZ|IE|ZA|DE|FR|ES|IT|NL|PT|BE|AT|CH|LU|DK|SE|NO|FI|IS'
      );
    });
  });
});

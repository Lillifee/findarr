import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMedia } from '../utils/testHelper.js';
import { calculateCustomPopularity } from './scoring.js';

describe('calculateCustomPopularity', () => {
  // Freeze time for deterministic age tests
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================
  // Base behavior
  // ============================================================

  it('should return base popularity if no votes or trending', () => {
    const result = calculateCustomPopularity(createMedia());
    expect(result).toBe(100);
  });

  it('should default missing popularity to 0', () => {
    const item = createMedia({ popularity: 0 });
    expect(calculateCustomPopularity(item)).toBe(0);
  });

  // ============================================================
  // Trending boosts
  // ============================================================

  it('should apply trending boost', () => {
    const item = createMedia({ trendingRank: 20 });
    const result = calculateCustomPopularity(item);
    expect(result).toBeGreaterThan(100); // boost applied
  });

  it('should apply strong boost for top 1 trending', () => {
    const item = createMedia({ trendingRank: 1 });
    const result = calculateCustomPopularity(item);
    expect(result).toBeGreaterThan(900); // large boost for rank 1
  });

  // ============================================================
  // Vote-based boosts
  // ============================================================

  it('should apply quality boost for high vote average', () => {
    const item = createMedia({
      voteAverage: 8,
      voteCount: 100,
    });

    const result = calculateCustomPopularity(item);

    expect(result).toBeGreaterThan(100);
  });

  it('should cap vote boost at 50', () => {
    const item = createMedia({
      voteAverage: 10,
      voteCount: 1_000_000,
      date: '2025-01-01',
    });

    const result = calculateCustomPopularity(item);
    const votePlusRecency = result - 100;
    expect(votePlusRecency).toBeLessThanOrEqual(75); // 50 vote + 25 recency
  });

  it('should apply exceptional boost for >=8.5 rating and >=500 votes', () => {
    const item = createMedia({
      voteAverage: 8.6,
      voteCount: 1000,
    });

    const result = calculateCustomPopularity(item);
    expect(result).toBeGreaterThan(100);
  });

  it('should apply recency boost for recent content (<=5 years)', () => {
    const item = createMedia({
      voteAverage: 7,
      voteCount: 100,
      date: '2024-01-01', // 1 year old
    });

    const result = calculateCustomPopularity(item);
    expect(result).toBeGreaterThan(100);
  });

  // ============================================================
  // Age penalties
  // ============================================================

  it('should apply age penalty for content >=8 years old', () => {
    const item = createMedia({
      voteAverage: 8,
      voteCount: 1000,
      date: '2017-01-01', // 9 years old
    });

    const result = calculateCustomPopularity(item);
    expect(result).toBeLessThan(200); // penalty applied
  });

  it('should apply age penalty for content >=15 years old', () => {
    const item = createMedia({
      voteAverage: 8,
      voteCount: 1000,
      date: '2010-01-01', // 16 years old
    });

    const result = calculateCustomPopularity(item);
    expect(result).toBeLessThan(100 + 50); // additional penalty
  });

  it('should apply age penalty for content >=20 years old', () => {
    const item = createMedia({
      voteAverage: 8,
      voteCount: 1000,
      date: '2005-01-01', // 21 years old
    });

    const result = calculateCustomPopularity(item);
    expect(result).toBeLessThan(100); // heavy penalty
  });

  it('should apply age penalty for content >=30 years old', () => {
    const item = createMedia({
      voteAverage: 8,
      voteCount: 1000,
      date: '1995-01-01', // 31 years old
    });

    const result = calculateCustomPopularity(item);
    expect(result).toBeLessThan(50); // very heavy penalty
  });

  // ============================================================
  // Edge cases
  // ============================================================

  it('should not apply vote logic if voteCount is 0', () => {
    const item = createMedia({
      voteAverage: 9,
      voteCount: 0,
    });

    const result = calculateCustomPopularity(item);
    expect(result).toBe(100);
  });

  it('should not apply vote logic if voteAverage is 0', () => {
    const item = createMedia({
      voteAverage: 0,
      voteCount: 100,
    });

    const result = calculateCustomPopularity(item);
    expect(result).toBe(100);
  });
});

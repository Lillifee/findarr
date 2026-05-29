import { describe, it, expect } from 'vitest';

import { getErrorMessage, isDefined, objectEntries, objectKeys } from './helper.js';

describe('helper', () => {
  it('should return true for defined values and false for undefined or null', () => {
    expect(isDefined('abc')).toEqual(true);
    expect(isDefined(undefined)).toEqual(false);
    expect(isDefined(null)).toEqual(false);
  });

  it('should return a typed version of Object.keys', () => {
    expect(objectKeys({ a: 1, b: 2 })).toEqual(['a', 'b']);
  });

  it('should return a typed version of Object.entries', () => {
    expect(objectEntries({ a: 1, b: 2 })).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('should return error message from Error object', () => {
    const error = new Error('Test error');
    expect(getErrorMessage(error)).toBe('Test error');
    expect(getErrorMessage('error')).toBe('error');
  });
});

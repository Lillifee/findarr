import { describe, it, expect } from 'vitest';
import { getErrorMessage, objectEntries, objectKeys } from './helper.js';

describe('helper', () => {
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
  });
});

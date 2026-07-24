import { getErrorMessage, isDefined, objectEntries, objectKeys } from './utils.js';

describe('helper', () => {
  it('should return true for defined values and false for undefined or null', () => {
    const undefinedValue = undefined;
    expect(isDefined('abc')).toBe(true);
    expect(isDefined(undefinedValue)).toBe(false);
    expect(isDefined(null)).toBe(false);
  });

  it('should return a typed version of Object.keys', () => {
    expect(objectKeys({ a: 1, b: 2 })).toStrictEqual(['a', 'b']);
  });

  it('should return a typed version of Object.entries', () => {
    expect(objectEntries({ a: 1, b: 2 })).toStrictEqual([
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

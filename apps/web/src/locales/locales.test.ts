import { describe, it, expect } from 'vite-plus/test';

import de from './de.json';
import en from './en.json';

type NestedRecord = { [key: string]: string | NestedRecord };

function collectKeys(obj: NestedRecord, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? collectKeys(value, fullKey) : [fullKey];
  });
}

// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const enKeys = collectKeys(en);
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const deKeys = new Set(collectKeys(de));

describe('locales', () => {
  it('de.json contains every key that en.json has', () => {
    const missing = enKeys.filter((key) => !deKeys.has(key));
    expect(missing, `Missing keys in de.json:\n  ${missing.join('\n  ')}`).toStrictEqual([]);
  });

  it('de.json has no extra keys that en.json does not have', () => {
    const enKeySet = new Set(enKeys);
    const extra = [...deKeys].filter((key) => !enKeySet.has(key));
    expect(extra, `Extra keys in de.json not in en.json:\n  ${extra.join('\n  ')}`).toStrictEqual(
      [],
    );
  });
});

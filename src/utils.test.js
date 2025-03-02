import { ensureArray, everyItem } from './utils';

test('everyItem', () => {
  expect(everyItem([1, true, 3])).toBe(true);
  expect(everyItem([1, true, false])).toBe(false);
  expect(everyItem([1, 2, 3], (v) => v > 0)).toBe(true);
  expect(everyItem([1, 'asd', {}, []], (v) => typeof v === 'string')).toBe(false);
});

test('ensureArray', () => {
  expect(ensureArray(undefined)).toStrictEqual([]);
  expect(ensureArray(1)).toStrictEqual([1]);
  expect(ensureArray([1, 'asd', {}])).toStrictEqual([1, 'asd', {}]);
});

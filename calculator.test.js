import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRoom } from './calculator.js';
test('room dimensions and Russian decimal separator', () => {
  assert.deepEqual(calculateRoom('5', '4', '2,7'), { area: 20, volume: 54, dimensions: [5, 4, 2.7] });
  assert.equal(calculateRoom('3.5', '2', '3').volume, 21);
});
test('invalid dimensions do not produce misleading results', () => {
  for (const value of ['', ' ', '0', '-2', 'abc', '2,3.4', 'Infinity', '1000001']) assert.equal(calculateRoom(value, 4, 3), null);
});

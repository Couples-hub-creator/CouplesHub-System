import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, parseDuration, relativeTimestamp } from './time';

test('parseDuration accepts compact units', () => {
  assert.equal(parseDuration('30m'), 1_800_000);
  assert.equal(parseDuration('1h30m'), 5_400_000);
  assert.equal(parseDuration('2d'), 172_800_000);
  assert.equal(parseDuration('1w'), 604_800_000);
});

test('parseDuration accepts bare minutes', () => {
  assert.equal(parseDuration('15'), 900_000);
});

test('parseDuration rejects malformed input', () => {
  assert.equal(parseDuration(''), null);
  assert.equal(parseDuration('soon'), null);
  assert.equal(parseDuration('1h garbage'), null);
  assert.equal(parseDuration('0m'), null);
});

test('formatDuration renders the largest useful units', () => {
  assert.equal(formatDuration(90_000), '1m 30s');
  assert.equal(formatDuration(3_600_000), '1h');
  assert.equal(formatDuration(0), '0s');
});

test('relativeTimestamp builds a Discord timestamp', () => {
  assert.equal(relativeTimestamp(new Date(1_700_000_000_000)), '<t:1700000000:R>');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILT_IN_STATIONS } from './stations';

test('built-in radio stations have unique names and https streams', () => {
  assert.ok(BUILT_IN_STATIONS.length >= 8, 'expected a usable station library');

  const names = new Set<string>();
  for (const station of BUILT_IN_STATIONS) {
    assert.ok(station.name.trim().length > 0, 'station name must not be empty');
    assert.ok(station.genre.trim().length > 0, `${station.name} must have a genre`);
    assert.match(station.streamUrl, /^https:\/\//, `${station.name} must use https`);
    const key = station.name.toLowerCase();
    assert.ok(!names.has(key), `duplicate station name: ${station.name}`);
    names.add(key);
  }
});

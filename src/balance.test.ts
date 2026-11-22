import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { simulate, type SimulationResult } from './simulate.js';

/**
 * Pacing targets for one run (no prestige yet), for a greedy player:
 * the first drive in ~20-40 min, the first building in ~1-2 h, then a
 * plateau. If a tuning change breaks these, re-check the curve before
 * loosening them.
 */

let fiveHours: SimulationResult;
const run = () => (fiveHours ??= simulate({ minutes: 5 * 60, stepSeconds: 2 }));

describe('balance', () => {
  it('fills the first drive in 20-40 minutes', () => {
    const drive = run().filled.hardDrive;
    assert.ok(drive, 'a drive is filled');
    assert.ok(drive.minutes >= 20 && drive.minutes <= 40, `drive at ${drive.minutes.toFixed(1)} min`);
  });

  it('fills the first building in 1-2 hours', () => {
    const building = run().filled.building;
    assert.ok(building, 'a building is filled');
    assert.ok(building.minutes >= 60 && building.minutes <= 120, `building at ${building.minutes.toFixed(1)} min`);
  });

  it('plateaus after the building: no city within 5 hours', () => {
    assert.strictEqual(run().filled.city, undefined);
    assert.ok(run().final.money.log10() < 30, `money ${run().final.money}`);
  });

  it('keeps "Faster" in check: single-digit levels after 5 hours', () => {
    const level = run().final.speedLevel;
    assert.ok(level >= 3 && level <= 9, `Faster level ${level}`);
  });

  it('brings every worker tier into play before the first drive fills', () => {
    const bought = run().filled.hardDrive!.bought;
    assert.ok(bought.every(n => n > 0), `bought at drive: ${bought.join(',')}`);
  });

  it('unlocks the early achievements in the first minutes', () => {
    const { achievements } = run();
    assert.ok(achievements['pages-1']! < 0.1);
    assert.ok(achievements['writers-room']! < 5, `writers' room at ${achievements['writers-room']} min`);
    assert.ok(achievements['hire-manager']! < 5, `first manager at ${achievements['hire-manager']} min`);
  });
});

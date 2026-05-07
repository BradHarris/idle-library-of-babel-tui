/**
 * Worker tier definitions for the Library of Babel idle game.
 * Each tier auto-hires one worker of the tier below it at a 30s interval.
 * Price scaling: baseCost × 1.5^count
 */
export const TIERS = [
  { id: 'writer',       name: 'Writer',      baseCost: 10,              autoHireBelow: null  },
  { id: 'manager',      name: 'Manager',     baseCost: 500,             autoHireBelow: 'writer' },
  { id: 'overseer',     name: 'Overseer',    baseCost: 5_000,           autoHireBelow: 'manager' },
  { id: 'rector',       name: 'Rector',      baseCost: 50_000,          autoHireBelow: 'overseer' },
  { id: 'cardinal',     name: 'Cardinal',    baseCost: 500_000,         autoHireBelow: 'rector' },
  { id: 'pope',         name: 'Pope',        baseCost: 10_000_000,      autoHireBelow: 'cardinal' },
  { id: 'archbishop',   name: 'Archbishop',  baseCost: 100_000_000,     autoHireBelow: 'pope' },
];

export const TICK_INTERVAL = 50;       // ms — logic tick
export const RENDER_INTERVAL = 100;    // ms — TUI re-render
export const AUTO_HIRE_INTERVAL = 30;  // seconds
export const EARNINGS_PER_PAGE = 1;    // $1.00 per page
export const PRNG_SEED_BITS = 32;      // 32-bit seed from SHA-256
export const LOG_MAX_ENTRIES = 10;     // maximum log entries to retain
export const LOG_CLEANUP_INTERVAL_TICKS = 500; // every 25s

/**
 * The 43-character alphabet: a-z, punctuation, digits, space.
 */
export const ALPHABET = ' .,!?()abcdefghijklmnopqrstuvwxyz0123456789';

export { LCG_M, LCG_A, LCG_C, lcgState, stateToPage } from './lcg.js';

import { lcgState, stateToPage } from './lcg.js';

/**
 * Generate a deterministic 280-character page string from a page number
 * using the LCG with full-period over all possible page combinations.
 * @param {bigint} pageNum — the page number to generate
 * @returns {string} — 280-character page string
 */
export function generatePage(pageNum) {
  return stateToPage(lcgState(pageNum), ALPHABET).split('').reverse().join('');
}

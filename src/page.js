import { createHash } from 'node:crypto';
import { TIERS } from './config.js';

/**
 * The 43-character alphabet: a-z, punctuation, digits, space.
 */
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz.,!()?0123456789 ';
const ALPHABET_SIZE = ALPHABET.length; // 43
const PAGE_LENGTH = 280;

/**
 * Mulberry32 — a fast, single-line seeded PRNG.
 * @param {number} seed — 32-bit unsigned integer seed
 * @returns {function}: PRNG function returning a 32-bit unsigned int
 */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a 32-bit unsigned integer seed from a page number using SHA-256.
 * @param {number|bigint|string} pageNum — the page number
 * @returns {number} — 32-bit unsigned integer seed
 */
function deriveSeed(pageNum) {
  const hash = createHash('sha256').update(String(pageNum)).digest();
  // Take first 4 bytes as a 32-bit unsigned integer
  return hash.readUInt32BE(0);
}

/**
 * Generate a deterministic 280-character page string from a page number.
 * @param {number|bigint} pageNum — the page number to generate
 * @returns {string} — 280-character page string using the 43-character alphabet
 */
export function generatePage(pageNum) {
  const seed = deriveSeed(pageNum);
  const prng = mulberry32(seed);
  const chars = new Array(PAGE_LENGTH);
  for (let i = 0; i < PAGE_LENGTH; i++) {
    const index = Math.floor(prng() * ALPHABET_SIZE);
    chars[i] = ALPHABET[index];
  }
  return chars.join('');
}

import { STORAGE_TIERS } from './config.js';

/**
 * Compute the storage scale hierarchy from a page count.
 * Each tier is calculated by floor-dividing the previous tier's count by the tier's multiplier.
 * @param {bigint} pagesGenerated — total page count
 * @returns {Array<{ name: string, count: bigint }>} — array of 10 tier objects
 */
export function computeStorageScale(pagesGenerated) {
  let currentInput = pagesGenerated;
  const result = [];

  for (const tier of STORAGE_TIERS) {
    const count = currentInput / tier.multiplier;
    result.push({
      name: tier.name,
      emoji: tier.emoji,
      count,
    });
    currentInput = count;
  }

  return result;
}

/**
 * Compute the page offset for a location tuple.
 * Returns the starting page number for the given hardDrive index.
 * All other location values are derived from the hardDrive index.
 *
 * @param {Record<string, bigint>} location — location tuple with keys matching STORAGE_TIERS ids
 * @returns {bigint} — the page number where this location starts
 */
export function pageOffsetFromLocation(location) {
  return (location[STORAGE_TIERS[0].id] || 0n) * STORAGE_TIERS[0].multiplier;
}

/**
 * Decompose a page number into a location tuple.
 * hardDrive = pages / PAGES_PER_DRIVE, then each subsequent level
 * is derived by successive division by the tier multiplier.
 *
 * @param {bigint} pageOffset — a non-negative page number
 * @returns {Record<string, bigint>} — location tuple with keys matching STORAGE_TIERS ids
 */
export function locationFromPageOffset(pageOffset) {
  let hardDrive = pageOffset / STORAGE_TIERS[0].multiplier;
  const location = {};
  for (let i = 0; i < STORAGE_TIERS.length; i++) {
    location[STORAGE_TIERS[i].id] = hardDrive;
    if (i + 1 < STORAGE_TIERS.length) {
      hardDrive = hardDrive / STORAGE_TIERS[i + 1].multiplier;
    }
  }
  return location;
}

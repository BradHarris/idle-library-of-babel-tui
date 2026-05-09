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

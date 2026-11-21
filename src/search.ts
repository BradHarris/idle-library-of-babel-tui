import { ALPHABET, queryToPageAddress, stateToPage } from './page.js';
import { locationFromPageOffset } from './storageScale.js';
import type { SearchResult } from './types.js';

/**
 * Look up the page holding `query`. It counts as found once that page
 * has been generated (address <= pagesGenerated).
 * Returns null for an empty query.
 */
export function searchLibrary(query: string, pagesGenerated: bigint): SearchResult | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const address = queryToPageAddress(trimmed);
  if (address > pagesGenerated) {
    return { type: 'notFound', address, pagesGenerated };
  }
  const content = stateToPage(address, ALPHABET).split('').reverse().join('');
  return { type: 'found', address, content, location: locationFromPageOffset(address) };
}

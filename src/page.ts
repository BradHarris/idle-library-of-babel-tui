import { stateToPage } from './lcg.js';

/**
 * The 43-character alphabet: space, punctuation, lowercase letters, digits.
 */
export const ALPHABET: string = ' .,!?()abcdefghijklmnopqrstuvwxyz0123456789';

export { LCG_M, LCG_A, LCG_C, lcgState, stateToPage } from './lcg.js';

/**
 * Convert a search query string to a page address.
 * Each character is looked up in the ALPHABET and its base-43 index
 * is used as a digit. The resulting base-43 number becomes the page address.
 * An empty query or a query with no matching characters produces address 0.
 *
 * The query is read in reverse because the LCG generates from
 * right-to-left (stateToPage fills chars[279] down to chars[0])
 * then reverses for display. To get query text to appear at the
 * start of the page, we feed it in reverse order into the base-43 number.
 */
export function queryToPageAddress(query: string): bigint {
  let address = 0n;
  for (let i = query.length - 1; i >= 0; i--) {
    const idx = ALPHABET.indexOf(query[i]!);
    if (idx >= 0) {
      address = address * 43n + BigInt(idx);
    }
  }
  return address;
}

/**
 * Generate a deterministic 280-character page string from a page number
 * using direct base-43 conversion of the page number.
 * (LCG permutation layer is currently bypassed; see lcg-page-generation spec.)
 */
export function generatePage(pageNum: bigint): string {
  // TODO: re-enable LCG — currently bypassing lcgState() for direct base-43 display
  return stateToPage(pageNum, ALPHABET).split('').reverse().join('');
}

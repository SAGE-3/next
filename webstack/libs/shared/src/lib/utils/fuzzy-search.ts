/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Fuse from 'fuse.js'

/**
 * https://www.fusejs.io/api/options.html#fuzzy-matching-options
 * Using Fuse.JS for fuzzy search
 * @param text String to search in
 * @param query The query to search for
 * @param [fuse] override the default fuse.js object
 * @returns {boolean} if its a match or not
 */

const options = {
  includeScore: false,
  ignoreLocation: true,
  threshold: 0.4,
  keys: ['text'],
};

const defaultFuse = new Fuse<{ text: string }>([], options);

export const fuzzySearch = (text: string, query: string, fuse?: Fuse<{ text: string }>): boolean => {
  if (!query) { return true }
  // Lowercase the text and query to make the search case-insensitive
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  !fuse && (fuse = defaultFuse);

  fuse.setCollection([{ text: normalizedText }]);
  const result = fuse.search(normalizedQuery);
  return result.length > 0;
};

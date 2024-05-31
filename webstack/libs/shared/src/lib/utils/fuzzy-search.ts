/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
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
  ignoreCase: true,
  includeScore: false,
  ignoreLocation: true,
  threshold: 0.4,
  keys: ['text'],
};

const defaultFuse = new Fuse<{ text: string }>([], options);

export const fuzzySearch = (text: string, query: string, fuse: Fuse<{ text: string }> = defaultFuse): boolean => {
  if (!query) {
    return true
  }
  
  fuse.setCollection([{ text: text }]);
  const result = fuse.search(query);
  return result.length > 0;
};

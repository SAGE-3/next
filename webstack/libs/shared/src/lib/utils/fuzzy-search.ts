/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * A simple fuzzy search implementation that checks if all words in the query are present in the text.
 *  This is not the official fuzzy search algorithm that uses levenshtein distance, just a cheap imitation to achieve fuzzy effects.
 * "Hello World" -> regex("h.*e.*l.*l.*o") && regex("w.*o.*r.*l.*d")
 * @param text String to search in
 * @param query The query to search for
 * @returns
 */
export const fuzzySearch = (text: string, query: string): boolean => {
  // Lowercase the text and query to make the search case-insensitive
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  return normalizedQuery.split(' ').every((word) => {
    // For cleaned words: specifically we do not want the user to input .*,(abc),etc. that could affect the regex.
    const cleanedWord = word.replace(/[^a-z0-9]/g, '');
    const pattern = cleanedWord.split('').join('.*');
    const regex = new RegExp(pattern);
    return regex.test(normalizedText);
  });
};

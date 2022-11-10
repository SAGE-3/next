/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Extract explicitly mentioned properties from the user's query
export default function extractHeaders(input: string, headers: string[]) {
  let extractedHeaders: string[] = [];
  headers.forEach((header) => {
    if (input.includes(header.toLowerCase())) {
      extractedHeaders.push(header);
    }
  });
  /**
   * Extracts headers relative to what header was spoken first
   * This is later used to recursivly iterate over the first spoken header
   */
  let wordPosition = [];
  for (let i = 0; i < extractedHeaders.length; i++) {
    wordPosition.push({
      index: input.indexOf(extractedHeaders[i].toLowerCase()),
      header: extractedHeaders[i],
    });
  }
  wordPosition.sort((a, b) => a.index - b.index);
  extractedHeaders = [];
  for (let i = 0; i < wordPosition.length; i++) {
    extractedHeaders.push(wordPosition[i].header);
  }

  return extractedHeaders;
}

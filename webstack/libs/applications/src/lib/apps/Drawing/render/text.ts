/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: text measurement and wrapping, so labels can be drawn as real SVG <text>
 * (which also survives the PNG export, unlike foreignObject).
 */

export const FONT_FAMILY = 'Helvetica, Arial, sans-serif';

/** Width of a line of text at a font size, in drawing units */
export type Measure = (text: string, fontSize: number) => number;

let context: CanvasRenderingContext2D | null = null;

/** Measures with a hidden 2D canvas (browser only) */
export const canvasMeasure: Measure = (text, fontSize) => {
  if (!context) context = document.createElement('canvas').getContext('2d');
  if (!context) return text.length * fontSize * 0.55;
  context.font = `${fontSize}px ${FONT_FAMILY}`;
  return context.measureText(text).width;
};

/** Split on line breaks, then wrap on spaces to maxWidth. A word wider than maxWidth stays whole. */
export function wrapText(text: string, maxWidth: number, fontSize: number, measure: Measure): string[] {
  if (!text) return [];
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (line && measure(candidate, fontSize) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: shape types, their zod schema, the colour palette and the S/M/L tables.
 * Shapes store colour and size names, never pixel or hex values.
 */

import { z } from 'zod';
import { genId } from '@sage3/shared';

export const COLOR_NAMES = ['black', 'grey', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
export type ColorName = (typeof COLOR_NAMES)[number];
export type Fill = ColorName | 'none';
export type Size = 'S' | 'M' | 'L';
export type Anchor = 'top' | 'right' | 'bottom' | 'left';
export type Head = 'none' | 'arrow' | 'dot';
export type BoxType = 'rect' | 'roundrect' | 'ellipse' | 'diamond' | 'text';
export type LinkType = 'line' | 'arrow';

// The colour of each name, for lines and text (stroke) and for shape interiors (fill)
export const PALETTE: Record<ColorName, { stroke: string; fill: string }> = {
  black: { stroke: '#1a202c', fill: '#e2e8f0' },
  grey: { stroke: '#718096', fill: '#f7fafc' },
  red: { stroke: '#c53030', fill: '#fed7d7' },
  orange: { stroke: '#dd6b20', fill: '#feebc8' },
  yellow: { stroke: '#d69e2e', fill: '#fefcbf' },
  green: { stroke: '#2f855a', fill: '#c6f6d5' },
  blue: { stroke: '#2b6cb0', fill: '#bee3f8' },
  purple: { stroke: '#6b46c1', fill: '#e9d8fd' },
};

export const STROKE_WIDTH: Record<Size, number> = { S: 3, M: 6, L: 12 };
export const FONT_SIZE: Record<Size, number> = { S: 16, M: 24, L: 36 };

const colorSchema = z.enum(COLOR_NAMES);
const fillSchema = z.union([colorSchema, z.literal('none')]);
const sizeSchema = z.enum(['S', 'M', 'L']);
const anchorSchema = z.enum(['top', 'right', 'bottom', 'left']);
const headSchema = z.enum(['none', 'arrow', 'dot']);

// A line or arrow end: x, y is always set (the free point, or the last known point of an attachment)
const endSchema = z.object({
  x: z.number(),
  y: z.number(),
  shapeId: z.string().optional(),
  anchor: anchorSchema.optional(),
});
export type End = z.infer<typeof endSchema>;

const baseSchema = z.object({
  id: z.string(),
  stroke: colorSchema,
  size: sizeSchema,
  label: z.string(),
  z: z.number(),
  group: z.string().optional(),
});

const boxSchema = baseSchema
  .extend({
    type: z.enum(['rect', 'roundrect', 'ellipse', 'diamond', 'text']),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    fill: fillSchema,
  })
  .strict();

const linkSchema = baseSchema
  .extend({
    type: z.enum(['line', 'arrow']),
    start: endSchema,
    end: endSchema,
    bend: z.number(),
    heads: z.object({ start: headSchema, end: headSchema }),
  })
  .strict();

const penSchema = baseSchema
  .extend({
    type: z.literal('pen'),
    // Flat list of coordinates: x0, y0, x1, y1, ...
    points: z.array(z.number()).refine((p) => p.length % 2 === 0, 'points must hold x, y pairs'),
  })
  .strict();

export type BoxShape = z.infer<typeof boxSchema>;
export type LinkShape = z.infer<typeof linkSchema>;
export type PenShape = z.infer<typeof penSchema>;
export type Shape = BoxShape | LinkShape | PenShape;
export type Shapes = Record<string, Shape>;

export const shapeSchema: z.ZodType<Shape> = z.union([boxSchema, linkSchema, penSchema]);

export const isBox = (s: Shape): s is BoxShape =>
  s.type === 'rect' || s.type === 'roundrect' || s.type === 'ellipse' || s.type === 'diamond' || s.type === 'text';
export const isLink = (s: Shape): s is LinkShape => s.type === 'line' || s.type === 'arrow';
export const isPen = (s: Shape): s is PenShape => s.type === 'pen';

// uuid v4; crypto.randomUUID is missing on plain http:// pages (walls, LAN clients)
export const newId = (): string => genId();

/** Layer order: by z, then by id, so every client stacks shapes with the same z the same way */
export const byLayer = (a: Shape, b: Shape): number => a.z - b.z || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Validate a saved drawing. Invalid entries, and entries whose id differs from their key,
 * are left out and their keys returned, so the rest of the drawing still opens.
 */
export function parseShapes(raw: unknown): { shapes: Shapes; rejected: string[] } {
  const shapes: Shapes = {};
  const rejected: string[] = [];
  if (!raw || typeof raw !== 'object') return { shapes, rejected };
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = shapeSchema.safeParse(value);
    if (parsed.success && parsed.data.id === key) shapes[key] = parsed.data;
    else rejected.push(key);
  }
  return { shapes, rejected };
}

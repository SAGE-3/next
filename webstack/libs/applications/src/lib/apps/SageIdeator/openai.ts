/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// ─── SageIdeator AI helpers (proxied through Seer) ───────────────────────────

import { seerIdeator } from '@sage3/frontend';
import { SError } from '@sage3/shared';
import { state as AppState } from './index';
import { DimBlend } from './VisualizationCanvas';

function isSError(r: unknown): r is SError {
  return typeof r === 'object' && r !== null && 'message' in r;
}

export async function generateDimensionsFromPrompt(
  prompt: string,
  model: string,
  numDims: number,
  imageBase64?: string,
  pdfContext?: string,
): Promise<{ categorical: Record<string, string[]>; ordinal: Record<string, string[]> }> {
  const result = await seerIdeator.dimensions({ prompt, numDims, model, imageBase64, pdfContext });
  if (isSError(result)) throw new Error(result.message);
  return { categorical: result.categorical as Record<string, string[]>, ordinal: result.ordinal as Record<string, string[]> };
}

export async function generateNodeContent(
  prompt: string,
  requirements: string,
  model: string,
  imageBase64?: string,
  pdfContext?: string,
): Promise<string> {
  const result = await seerIdeator.node({ prompt, requirements, model, imageBase64, pdfContext });
  if (isSError(result)) throw new Error(result.message);
  return result.r;
}

export async function abstractNode(
  text: string,
  model: string,
  temperature = 0,
): Promise<{ Title: string; Summary: string; Keywords: string[]; Steps: string[]; Structure: string }> {
  const result = await seerIdeator.abstract({ text, model, temperature });
  if (isSError(result)) throw new Error(result.message);
  return { ...result, Structure: '' };
}

export async function generateUserDimension(
  dimName: string,
  prompt: string,
  nodes: Array<{ ID: string; Title: string; Summary: string }>,
  model: string,
): Promise<{
  type: 'categorical' | 'ordinal';
  values: string[];
  assignments: Record<string, string>;
}> {
  const result = await seerIdeator.userDimension({ dimName, prompt, nodes, model });
  if (isSError(result)) throw new Error(result.message);
  return { type: result.type as 'categorical' | 'ordinal', values: result.values, assignments: result.assignments };
}

export async function summarizeFavorites(
  nodes: Array<{ Title: string; Summary: string; Keywords: string[] }>,
  prompt: string,
  model: string,
): Promise<string> {
  const result = await seerIdeator.summarize({ nodes, prompt, model });
  if (isSError(result)) throw new Error(result.message);
  return result.r;
}

export async function generateNodeImage(
  title: string,
  summary: string,
  keywords: string[],
  model: string,
  brainstormingPrompt?: string,
  dimension?: { categorical: Record<string, string>; ordinal: Record<string, string> },
  signal?: AbortSignal,
  additionalContext?: string,
): Promise<string> {
  const result = await seerIdeator.image({ title, summary, keywords, model, brainstormingPrompt, dimension, additionalContext }, signal);
  if (isSError(result)) throw new Error(result.message);
  return result.imageUrl;
}

export async function callProseAPI(
  userPrompt: string,
  model: string,
): Promise<string> {
  const result = await seerIdeator.prose({ userPrompt, model });
  if (isSError(result)) throw new Error(result.message);
  return result.r;
}

export function buildBlendedRequirements(
  dims: AppState['dimensions'],
  xDimName: string | null,
  xBlend: DimBlend | null,
  yDimName: string | null,
  yBlend: DimBlend | null,
): { requirements: string; categorical: Record<string, string>; ordinal: Record<string, string> } {
  let req = '';
  const categorical: Record<string, string> = {};
  const ordinal: Record<string, string> = {};
  for (const dim of dims) {
    const blend = dim.name === xDimName ? xBlend : dim.name === yDimName ? yBlend : null;
    let assignedValue: string;
    if (blend) {
      if (blend.secondary === null || blend.primaryWeight === 1) {
        req += `${dim.name}: ${blend.primary}\n`;
        assignedValue = blend.primary;
      } else if (blend.primaryWeight >= 0.65) {
        req += `${dim.name}: primarily "${blend.primary}" with some "${blend.secondary}" influence\n`;
        assignedValue = blend.primary;
      } else {
        const pct = Math.round(blend.primaryWeight * 100);
        const sPct = 100 - pct;
        req += `${dim.name}: blend of "${blend.primary}" (${pct}%) and "${blend.secondary}" (${sPct}%)\n`;
        assignedValue = blend.primary;
      }
    } else {
      assignedValue = dim.values[Math.floor(Math.random() * dim.values.length)];
      req += `${dim.name}: ${assignedValue}\n`;
    }
    if (dim.type === 'categorical') categorical[dim.name] = assignedValue;
    else ordinal[dim.name] = assignedValue;
  }
  return { requirements: req, categorical, ordinal };
}

export function buildRequirements(dims: {
  categorical: Record<string, string[]>;
  ordinal: Record<string, string[]>;
}): {
  requirements: string;
  categorical: Record<string, string>;
  ordinal: Record<string, string>;
} {
  let req = '';
  const categorical: Record<string, string> = {};
  const ordinal: Record<string, string> = {};
  Object.entries(dims.categorical).forEach(([name, values]) => {
    const v = values[Math.floor(Math.random() * values.length)];
    req += `${name}: ${v}\n`;
    categorical[name] = v;
  });
  Object.entries(dims.ordinal).forEach(([name, values]) => {
    const v = values[Math.floor(Math.random() * values.length)];
    req += `${name}: ${v}\n`;
    ordinal[name] = v;
  });
  return { requirements: req, categorical, ordinal };
}

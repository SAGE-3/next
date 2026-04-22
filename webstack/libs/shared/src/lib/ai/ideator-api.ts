/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// ─── SageIdeator API types ────────────────────────────────────────────────────

export type IdeatorDimensionsRequest = {
  prompt: string;
  numDims: number;
  model: string;
  imageBase64?: string;
  pdfContext?: string;
};

export type IdeatorDimensionsResponse = {
  categorical: Record<string, string[]>;
  ordinal: Record<string, string[]>;
  success: boolean;
};

export type IdeatorNodeRequest = {
  prompt: string;
  requirements: string;
  model: string;
  imageBase64?: string;
  pdfContext?: string;
};

export type IdeatorNodeResponse = {
  r: string;
  success: boolean;
};

export type IdeatorAbstractRequest = {
  text: string;
  model: string;
};

export type IdeatorAbstractResponse = {
  Title: string;
  Summary: string;
  Keywords: string[];
  Steps: string[];
  success: boolean;
};

export type IdeatorUserDimensionRequest = {
  dimName: string;
  prompt: string;
  nodes: Array<{ ID: string; Title: string; Summary: string }>;
  model: string;
};

export type IdeatorUserDimensionResponse = {
  type: 'categorical' | 'ordinal';
  values: string[];
  assignments: Record<string, string>;
  success: boolean;
};

export type IdeatorSummarizeRequest = {
  nodes: Array<{ Title: string; Summary: string; Keywords: string[] }>;
  prompt: string;
  model: string;
};

export type IdeatorSummarizeResponse = {
  r: string;
  success: boolean;
};

export type IdeatorImageRequest = {
  title: string;
  summary: string;
  keywords: string[];
  model: string;
  brainstormingPrompt?: string;
  dimension?: { categorical: Record<string, string>; ordinal: Record<string, string> };
};

export type IdeatorImageResponse = {
  imageUrl: string;
  success: boolean;
};

export type IdeatorProseRequest = {
  userPrompt: string;
  model: string;
};

export type IdeatorProseResponse = {
  r: string;
  success: boolean;
};

export const IdeatorRoutes = {
  dimensions: '/dimensions',
  node: '/node',
  abstract: '/abstract',
  userDimension: '/user-dimension',
  summarize: '/summarize',
  image: '/image',
  prose: '/prose',
} as const;

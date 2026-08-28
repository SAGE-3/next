/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Generic image generation.
//
// This is the plain "make an image from this prompt" path, used by any app that
// wants an image. It is deliberately separate from the Ideator's image call,
// which composes a brainstorming-specific prompt from ideator concepts
// (dimensions, brainstorming prompt) and is only meaningful inside SageIdeator.

/** Where the generic image-generation endpoint lives. */
export const ImageGenerationRoutes = {
  generate: '/image-generation',
} as const;

export type ImageGenerationRequest = {
  /** The prompt, used as given. The caller decides how to phrase it. */
  prompt: string;
  /** Provider name, as for every other AI request. */
  model: string;
  /** Optional square size; defaults to 1024x1024 when omitted. */
  size?: string;
};

export type ImageGenerationResponse = {
  /** The generated image as a data URL. */
  imageUrl: string;
};

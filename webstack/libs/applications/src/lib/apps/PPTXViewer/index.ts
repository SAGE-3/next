/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: PPTXViewer
 * created by: Luc Renambot
 */

export const schema = z.object({
  // The PowerPoint asset displayed by the app
  assetid: z.string(),
  // Slide shown to everyone on the board (0-based)
  currentSlide: z.number(),
  // Number of slides in the deck, known once the file has been parsed (0 until then)
  numSlides: z.number(),
  // Last video/audio clip someone played or stopped ("<slide>:<n-th clip on that slide>"),
  // mirrored on every client
  mediaKey: z.string(),
  mediaPlaying: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  currentSlide: 0,
  numSlides: 0,
  mediaKey: '',
  mediaPlaying: false,
};

export const name = 'PPTXViewer';

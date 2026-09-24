/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { getMime, isPPTX, isValid } from './mime-utils';

const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

describe('PowerPoint files', () => {
  it('resolves .pptx to the presentation type, as the files server does on upload', () => {
    expect(getMime('deck.pptx')).toBe(PPTX);
  });

  it('recognizes the presentation type', () => {
    expect(isPPTX(PPTX)).toBe(true);
    expect(isPPTX('application/pdf')).toBe(false);
    // Legacy binary .ppt is a different format the renderer does not read
    expect(isPPTX('application/vnd.ms-powerpoint')).toBe(false);
  });

  it('is a supported type, so it opens in a viewer instead of a generic asset link', () => {
    expect(isValid(PPTX)).toBe(true);
  });
});

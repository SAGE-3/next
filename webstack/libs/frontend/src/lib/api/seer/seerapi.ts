/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls } from '../../config';

/**
 * Send a Prompt to the Seer API
 * @param textPrompt the text prompt to send
 * @param userId the user id to send the prompt to
 * @returns
 */
async function sendPrompt(textPrompt: string, userId: string): Promise<{ ok: boolean; code: string }> {
  const response = await fetch(apiUrls.seer.sendNL2Code(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text_prompt: textPrompt,
      user_id: userId,
    }),
  });
  const ok = response.ok;
  if (!ok) {
    return { ok, code: 'x=1' };
  } else {
    const data = await response.json();
    const d = JSON.parse(data);
    return { ok, code: d.code };
  }
}

export const SeerAPI = {
  sendPrompt,
};

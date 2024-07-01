/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * This function returns a sends the audio to the fastAPI server to transcribe audio
 * @param body Object for audio blob.
 * @returns
 */
async function sendAudio(body: { blob: Blob | null }): Promise<any> {
  if (!body.blob) {
    console.log('No audio blob to send');
    return;
  }

  // Audio needs to be sent as a form
  const formData = new FormData();
  formData.append('file', body.blob, 'audio.webm');

  // Sending the audio
  const response = await fetch('/api/articulate/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    console.log('Error in response:', response.statusText);
    return;
  }

  const data = await response.json();
  console.log('Response Data:', data);
  return data;
}

async function sendText(text: string): Promise<any> {
  console.log('sending text', text);

  const response = await fetch('/api/articulate/processIfCommand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: text, context: '', chartContext: '' }),
  });

  if (!response.ok) {
    console.log('Error in response:', response.statusText);
    return;
  }

  const data = await response.json();
  console.log('Response Data:', data);

  return data;
}

async function sendCommand(
  text: string,
  interactionContext: {
    lastChartsInteracted: string[];
    lastChartsGenerated: string[];
    lastChartsSelected: string[];
  }
): Promise<any> {
  console.log('sending text', text);

  const response = await fetch('/api/articulate/processCommand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: text, context: '', chartContext: JSON.stringify(interactionContext) }),
  });

  if (!response.ok) {
    console.log('Error in response:', response.statusText);
    return;
  }

  const data = await response.json();
  console.log('Response Data:', data);

  return data;
}

export const ArticulateAPI = {
  sendAudio,
  sendText,
  sendCommand,
};

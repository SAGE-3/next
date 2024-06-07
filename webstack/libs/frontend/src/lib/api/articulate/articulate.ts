async function sendAudio(body: { blob: Blob | null }): Promise<any> {
  if (!body.blob) {
    console.log('No audio blob to send');
    return;
  }
  const formData = new FormData();
  formData.append('file', body.blob, 'audio.webm'); // Ensure 'file' matches the parameter name in the server endpoint

  const response = await fetch('/api/articulate/transcribe', {
    method: 'POST',
    body: formData, // FormData automatically sets the correct headers
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
};

type PromptType = {
  prompt: string;
  dataset: string;
  skip: boolean;
};

/**
 * Uploads a CSV file to Articulate
 * @param body 
 * @returns 
 */
export async function uploadCsv(body: FormData) {
  try {
    const res = await fetch('/api/articulate/uploadcsv', {
      method: 'POST',
      body: body,
    });

    if (!res.ok) throw new Error('Failed to upload CSV');

    return res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate chart',
    };
  }
}

/**
 * Get the transformed CSV
 * @param id
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
export async function getTransformedCsv(id: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const res = await fetch(`/api/articulate/csv/${id}`);

    if (!res.ok) throw new Error('Failed to get transformed CSV');

    return res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate chart',
    };
  }
}

/**
 * Sends prompt and generates a chart
 * @param body
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendPrompt(body: PromptType): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('body from send prompt', body);
    const res = await fetch('/api/articulate/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error('Failed to generate chart');

    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate chart',
    };
  }
}

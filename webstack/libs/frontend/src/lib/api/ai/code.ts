/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls } from '@sage3/frontend';

type CodeEditorRequest = 'explain' | 'refactor' | 'comment' | 'generate';

// Prompts
function generateRequest(language: string, content: string, type: CodeEditorRequest) {
  switch (type) {
    case 'explain':
      return `[INST]Explain the following ${language} code: ${content}[/INST]`;
    case 'refactor':
      return `[INST]Can you refactor this ${language} code. Only return the new code. Do not include any text, only code. Do not include ${'```'}: ${content}[/INST]`;
    case 'comment':
      return `[INST] <<SYS>> You are a good programmer. Return only the new version code. <<SYS>> Can you add comments in this ${language} code to explain clearly what each instruction is supposed to do: ${content} [/INST]`;
    case 'generate':
      return `[INST]<<SYS>> You are an expert programmer that helps to write ${language} code based on the user request. Don't be too verbose. Return only commented code. <<SYS>> ${content}[/INST] `;
  }
}

type CodeEditorAPIResponse = {
  success: boolean;
  error_message?: string;
  generated_text?: string;
};

// Explain the code
async function generate(language: string, content: string, type: CodeEditorRequest): Promise<CodeEditorAPIResponse> {
  const modelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const modelBody = {
    ai_query: generateRequest(language, content, type),
  };
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.code.generate, {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(modelBody),
    });
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.success) {
      return {
        success: true,
        generated_text: jsonResponse.data.generated_text,
      };
    } else {
      return {
        success: false,
        error_message: `API AI ERROR> ${jsonResponse.error_message}`,
      };
    }
  } catch (error) {
    // Return an error message if the request fails
    return {
      success: false,
      error_message: `API AI ERROR> ${error}`,
    };
  }
}

// Status Request off API Service
async function status(): Promise<boolean> {
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.code.status, {
      method: 'GET',
    });
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.online) {
      return true;
    } else {
      console.log('API AI ERROR> ', jsonResponse.error_message);
      return false;
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API AI ERROR> ', error);
    return false;
  }
}

export { generate, status };

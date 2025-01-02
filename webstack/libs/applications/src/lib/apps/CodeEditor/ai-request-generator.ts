/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

type CodeEditorRequest = 'explain' | 'refactor' | 'comment' | 'generate';

// Prompts
export function generateRequest(language: string, content: string, type: CodeEditorRequest) {
  switch (type) {
    case 'explain':
      return `Explain the following code: ${content}`;
    case 'refactor':
      return `Can you refactor this code: ${content}`;
    case 'comment':
      return `Can you add comments in this code to explain clearly what each instruction is supposed to do: ${content}`;
    case 'generate':
      return content;
  }
}

export function generateSystemPrompt(language: string, content: string, type: CodeEditorRequest) {
  switch (type) {
    case 'explain':
      return `You are an expert programmer that helps to write ${language} code. Do not hallucinate. Do not make up factual information.\n`;
    case 'refactor':
      return `You are an expert programmer that helps to write ${language} code. Only return code. Do not include any other text. Do not hallucinate. Do not make up factual information.\n`;
    case 'comment':
      return `You are a expert in documentation for ${language} code. Do not hallucinate. Do not make up factual information. Be concise.\n`;
    case 'generate':
      return `You are an expert programmer that helps to write ${language} code based on the user request. Don't be too verbose. Return only commented code. Do not hallucinate. Do not make up factual information.\n`;
  }
}

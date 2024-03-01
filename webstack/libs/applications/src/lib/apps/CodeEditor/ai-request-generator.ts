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
      return `[INST] <<SYS>>\nYou are an expert programmer that helps to write ${language} code.\n<</SYS>>\n\nExplain the following code: ${content}[/INST]`;
    case 'refactor':
      return `[INST] <<SYS>>\nYou are an expert programmer that helps to write ${language} code. Only return code. Do not include any other text.\n<</SYS>>\n\nCan you refactor this code: ${content}[/INST]`;
    case 'comment':
      return `[INST] <<SYS>>\nYou are a expert in documentation for ${language} code.\n<</SYS>>\n\nCan you add comments in this code to explain clearly what each instruction is supposed to do and be concise: ${content} [/INST]`;
    case 'generate':
      return `[INST] <<SYS>>\nYou are an expert programmer that helps to write ${language} code based on the user request. Don't be too verbose. Return only commented code.\n<</SYS>>${content} [/INST]`;
  }
}

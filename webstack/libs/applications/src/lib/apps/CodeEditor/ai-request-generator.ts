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
      return `[INST]Explain the following ${language} code: ${content}[/INST]`;
    case 'refactor':
      return `[INST]Can you refactor this ${language} code. Only return the new code. Do not include any text, only code. Do not include ${'```'}: ${content}[/INST]`;
    case 'comment':
      return `[INST] <<SYS>> You are a good programmer. Return only the new version code. <<SYS>> Can you add comments in this ${language} code to explain clearly what each instruction is supposed to do: ${content} [/INST]`;
    case 'generate':
      return `[INST]<<SYS>> You are an expert programmer that helps to write ${language} code based on the user request. Don't be too verbose. Return only commented code. <<SYS>> ${content}[/INST] `;
  }
}

/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Button, HStack, Text, Tooltip } from '@chakra-ui/react';
import { HiCommandLine } from 'react-icons/hi2';

import { OperationMode } from './constants';

// One quick-prompt button: an icon + label, with a tooltip, fired on click.
function PromptButton({ label, tooltip, onClick }: { label: string; tooltip: string; onClick: () => void }) {
  return (
    <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={tooltip} openDelay={400}>
      <Button
        aria-label="stop"
        size={'xs'}
        p={0}
        m={0}
        colorScheme={'blue'}
        variant="ghost"
        textAlign={'left'}
        onClick={onClick}
        width="34%"
      >
        <HiCommandLine fontSize={'24px'} />
        <Text ml={'2'}>{label}</Text>
      </Button>
    </Tooltip>
  );
}

// The handlers each prompt button invokes (owned by the Chat component).
export interface PromptBarHandlers {
  onSummary: () => void;
  onProsCons: () => void;
  onKeywords: () => void;
  onImageGeneration: () => void;
  onFacts: () => void;
  onCodeRefactor: () => void;
  onCodeExplain: () => void;
  onCodeComment: () => void;
  onCodeGenerate: () => void;
  onImageSummary: () => void;
  onImageCaption: () => void;
  onImageProsCons: () => void;
  onImageKeywords: () => void;
  onImageFacts: () => void;
  onContentPDF: (prompt: string) => void;
  onContentWeb: (prompt: string) => void;
  onContentWebScreenshot: () => void;
}

// Static prompt text for the PDF / Web modes; each fires the matching handler.
const PDF_PROMPTS = [
  {
    title: 'Generate Summary',
    prompt:
      'Provide a summary of the main findings and conclusions of these papers, including the research question, methods used, and key results.',
  },
  {
    title: 'Gaps and Limitations',
    prompt:
      'What limitations or gaps does these papers identify in their own studies or in the broader field of research? How do the authors suggest overcoming these issues in future research?.',
  },
  {
    title: 'Literature and References',
    prompt:
      'What are the key references and theoretical frameworks that these papers builds upon? Summarize how these studies contributes to existing research in the field.',
  },
  {
    title: 'Methodology Analysis',
    prompt:
      'Describe the research methodology used in these papers. What were the sample size, experimental design, data collection methods, and statistical analyses applied used.',
  },
  {
    title: 'Explain implications',
    prompt:
      'What are the practical and theoretical implications of these studies findings? How might they influence future research, trends, or real-world applications in the field?.',
  },
];

const WEB_PROMPTS: { title: string; prompt: string; screenshot?: boolean }[] = [
  { title: 'Web Summary', prompt: 'Summarize concisely this webpage.' },
  { title: 'Find Links', prompt: 'What are the main links that I should read to expand on the subject matter.' },
  { title: 'Find PDF', prompt: 'Find the PDF in the page.' },
  { title: 'Generate Keywords', prompt: 'Return a list of 3-5 keywords that best capture the essence and subject matter of the text.' },
  { title: 'Find Facts', prompt: 'Provide a list of two or three interesting facts from the text.' },
  { title: 'Screenshot', prompt: 'Take a screenshot', screenshot: true },
];

/**
 * The row of quick-prompt buttons shown under the transcript. Which buttons
 * appear depends on the type of the linked source app (text/code/image/pdf/web).
 * Chat mode and Hawaii Mesonet have no quick prompts.
 */
export function PromptBars({ mode, handlers }: { mode: OperationMode; handlers: PromptBarHandlers }): JSX.Element | null {
  if (mode === 'chat') return null;
  return (
    <>
      <hr />
      {mode === 'text' && (
        <HStack>
          <PromptButton
            label="Generate Summary"
            tooltip="Identify the main topics, themes, and key concepts that are covered in the text"
            onClick={handlers.onSummary}
          />
          <PromptButton label="Give feedback" tooltip="Identify the pros and cons of the text" onClick={handlers.onProsCons} />
          <PromptButton
            label="Generate Keywords"
            tooltip="Extract 3-5 keywords that best capture the essence and subject matter of the text"
            onClick={handlers.onKeywords}
          />
          <PromptButton
            label="Image Generation"
            tooltip="Generate an image from the text and place it on the board"
            onClick={handlers.onImageGeneration}
          />
          <PromptButton label="Find Facts" tooltip="Provide two or three interesting facts from the text" onClick={handlers.onFacts} />
        </HStack>
      )}
      {mode === 'code' && (
        <HStack>
          <PromptButton label="Refactor Code" tooltip="Refactor the code" onClick={handlers.onCodeRefactor} />
          <PromptButton label="Explain Code" tooltip="Explain the code" onClick={handlers.onCodeExplain} />
          <PromptButton label="Comment Code" tooltip="Comment the code" onClick={handlers.onCodeComment} />
          <PromptButton label="Generate Code" tooltip="Generate some code" onClick={handlers.onCodeGenerate} />
        </HStack>
      )}
      {mode === 'image' && (
        <HStack>
          <PromptButton label="Describe Image" tooltip="Describe the image in details" onClick={handlers.onImageSummary} />
          <PromptButton label="Generate Caption" tooltip="Generate a caption for the image" onClick={handlers.onImageCaption} />
          <PromptButton
            label="Give Feedback"
            tooltip="Describe the good parts and then the bad parts of the image"
            onClick={handlers.onImageProsCons}
          />
          <PromptButton
            label="Generate Keywords"
            tooltip="Generate 3-5 keywords that best capture the essence and subject matter of the image"
            onClick={handlers.onImageKeywords}
          />
          <PromptButton
            label="Find Facts"
            tooltip="Provide two or three interesting facts about the image"
            onClick={handlers.onImageFacts}
          />
        </HStack>
      )}
      {mode === 'pdf' && (
        <HStack>
          {PDF_PROMPTS.map((p, i) => (
            <PromptButton key={i} label={p.title} tooltip={p.prompt} onClick={() => handlers.onContentPDF('@S ' + p.prompt)} />
          ))}
        </HStack>
      )}
      {mode === 'web' && (
        <HStack>
          {WEB_PROMPTS.map((p, i) => (
            <PromptButton
              key={i}
              label={p.title}
              tooltip={p.prompt}
              onClick={() => (p.screenshot ? handlers.onContentWebScreenshot() : handlers.onContentWeb('@S ' + p.prompt))}
            />
          ))}
        </HStack>
      )}
    </>
  );
}

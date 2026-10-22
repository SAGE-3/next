/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import { Box, Table, Tr, Td, Th, Thead, Tbody } from '@chakra-ui/react';
import { BsCopy, BsCheck, BsDiagram3 } from 'react-icons/bs';

import { useAppStore, useLinkStore, setupApp } from '@sage3/frontend';

// markdown-to-jsx overrides used when rendering SAGE answers.

// Indent ordered/unordered lists so nested items read clearly.
export const MdOrderedList: React.FC<{ children: React.ReactNode }> = ({ children, ...props }) => (
  <ol style={{ paddingLeft: '24px' }} {...props}>
    {children}
  </ol>
);

export const MdUnorderedList: React.FC<{ children: React.ReactNode }> = ({ children, ...props }) => (
  <ul style={{ paddingLeft: '24px' }} {...props}>
    {children}
  </ul>
);

// Open Mermaid code in a Mermaid app next to the Chat app, linked to it
async function openDiagram(chatId: string, code: string) {
  const chat = useAppStore.getState().apps.find((a) => a._id === chatId);
  if (!chat) return;
  const { position, size, roomId, boardId } = chat.data;
  const app = setupApp(
    'Mermaid',
    'Mermaid',
    position.x + size.width + 20,
    position.y,
    roomId,
    boardId,
    { w: 800, h: 600 },
    { content: code },
  );
  app.sourceApps = [chatId];
  const res = await useAppStore.getState().create(app);
  if (res.success === true) {
    useLinkStore.getState().addLink(chatId, res.data._id, boardId, 'provenance');
  }
}

// Render a fenced code block with a language label header and a copy button.
// Mermaid blocks also get a button to open the diagram in a Mermaid app.
export const MdCode: React.FC<{ children: React.ReactNode; appId?: string }> = ({ children, appId, ...props }) => {
  // @ts-ignore
  const lang = props.className ? props.className.replace('lang-', '') : 'text';
  const [copied, setCopied] = useState(false);
  return (
    <Table
      variant="unstyled"
      size="sm"
      style={{
        borderSpacing: 0,
        borderCollapse: 'separate',
        borderRadius: '10px 10px 10px 10px',
        border: '1px solid black',
      }}
    >
      <Thead>
        <Tr backgroundColor="#e5e5e5">
          <Th style={{ borderRadius: '10px 10px 0 0' }} textTransform={'capitalize'} fontWeight={'normal'}>
            <Box display={'flex'} justifyContent={'space-between'}>
              <span>
                <b>{lang}</b>
              </span>
              <Box display={'flex'} alignItems={'center'} gap={3}>
                <Box
                  display={'flex'}
                  alignItems={'center'}
                  userSelect={'none'}
                  _hover={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCopied(true);
                    // Copy the code to clipboard
                    navigator.clipboard.writeText(children as string);
                  }}
                >
                  {copied ? <BsCheck /> : <BsCopy />} <span> {copied ? 'Copied' : 'Copy'} </span>
                </Box>
                {lang === 'mermaid' && appId && (
                  <Box
                    display={'flex'}
                    alignItems={'center'}
                    gap={1}
                    userSelect={'none'}
                    _hover={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDiagram(appId, children as string);
                    }}
                  >
                    <BsDiagram3 /> <span>Open in App</span>
                  </Box>
                )}
              </Box>
            </Box>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr>
          <Td style={{ padding: 0 }} colSpan={1}>
            <pre style={{ fontSize: 'smaller', paddingLeft: '24px', backgroundColor: '#fafafa', borderRadius: '0 0 10px 10px' }} {...props}>
              <code {...props} style={{ userSelect: 'text' }}>
                {children}
              </code>
            </pre>
          </Td>
        </Tr>
      </Tbody>
    </Table>
  );
};

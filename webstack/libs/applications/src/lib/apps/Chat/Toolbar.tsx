/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ButtonGroup, Button, Tooltip } from '@chakra-ui/react';
import { MdFileDownload } from 'react-icons/md';
import { format } from 'date-fns/format';

import { useUser, downloadFile } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';

/* App toolbar component for the app Chat: download the transcript as text. */
export function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { user } = useUser();
  // Sort messages by creation date to display in order
  const sortedMessages = s.messages ? s.messages.sort((a, b) => a.creationDate - b.creationDate) : [];

  // Rebuild the conversation as plain text and trigger a file download
  const downloadTxt = () => {
    let content = '';
    sortedMessages.map((message) => {
      const isMe = user?._id == message.userId;
      if (message.query.length) {
        if (isMe) {
          content += `Me> ${message.query}\n`;
        } else {
          content += `${message.userName}> ${message.query} \n`;
        }
      }
      if (message.response.length) {
        if (message.response !== 'Working on it...') {
          content += `SAGE> ${message.response} \n`;
        }
      }
    });

    const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    const filename = 'sage-' + dt + '.txt';
    downloadFile(txturl, filename);
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top" hasArrow={true} label={'Download Transcript'} openDelay={400}>
          <Button onClick={downloadTxt} size="xs" px={0}>
            <MdFileDownload fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, shown when a group of apps is selected.
 * @returns JSX.Element | null
 */
export const GroupedToolbarComponent = () => {
  return null;
};

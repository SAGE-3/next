/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Button, ButtonGroup, Tooltip, useToast } from '@chakra-ui/react';
import { MdFileDownload, MdContentCopy } from 'react-icons/md';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

import { downloadFile } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

/* App component for HTMLViewer */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  return (
    <AppWindow app={props}>
      <Box overflow={"clip"} dangerouslySetInnerHTML={{ __html: s.content }} pointerEvents={"none"}>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app HTMLViewer */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const toast = useToast();

  // Download the content as a text file
  const downloadTxt = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const content = stripHtml(s.content);
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'paste-' + dt + '.txt';
    // Go for download
    downloadFile(txturl, filename);
  };

  // Copy the content into the clipboard
  const copyTxt = () => {
    if (navigator.clipboard) {
      // Remove HTML tags
      const content = stripHtml(s.content);
      // Copy to clipboard
      navigator.clipboard.writeText(content);
      // Notify the user
      toast({
        title: 'Success',
        description: `Content Copied to Clipboard`,
        duration: 3000,
        isClosable: true,
        status: 'success',
      });
    }
  };

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
      <Tooltip placement="top-start" hasArrow={true} label={'Copy Text'} openDelay={400}>
        <Button onClick={copyTxt}>
          <MdContentCopy />
        </Button>
      </Tooltip>
      <Tooltip placement="top-start" hasArrow={true} label={'Download as Text'} openDelay={400}>
        <Button onClick={downloadTxt}>
          <MdFileDownload />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
}

export default { AppComponent, ToolbarComponent };

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html: string) {
  // See <https://github.com/developit/preact-markup/blob/4788b8d61b4e24f83688710746ee36e7464f7bbc/src/parse-markup.js#L60-L69>
  const doc = document.implementation.createHTMLDocument('')
  doc.documentElement.innerHTML = html.trim()
  return doc.body.textContent || doc.body.innerText || ''
}
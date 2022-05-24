/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect } from 'react';

// Import Chakra UI elements
import {
  Drawer, DrawerContent, DrawerCloseButton, DrawerBody,
  useColorMode,
  Switch, HStack, FormLabel, Text, Button
} from '@chakra-ui/react';

// Ace editor
import AceEditor from 'react-ace';
import 'ace-builds/src-min-noconflict/mode-yaml.js';
// Dark mode
import 'ace-builds/src-min-noconflict/theme-monokai.js';
// Light mode
import 'ace-builds/src-min-noconflict/theme-github.js';

// SAGE3 components
import { boardColor } from '@sage3/frontend/ui';
import { useSocket } from '@sage3/frontend/utils/misc/socket';

/**
 * Prop type for the minimap
 *
 * @interface MinimapProps
 */
interface NotificationsProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Log message coming from Fluent, through the server
interface LogMessage {
  message: string;
  tag: string;
  time: Date;
}

/**
 * Notification Center component
 *
 * @export
 * @param {NotificationsProps} props
 * @returns {JSX.Element}
 */
export function Notifications({ boardId, isOpen, onClose }: NotificationsProps): JSX.Element {
  const socket = useSocket();
  const [someLog, setSomeLog] = React.useState<string>('');
  const [aiLogs, setAiLogs] = React.useState(true);
  const [httpLogs, setHttpLogs] = React.useState(true);
  // Get the color theme: light or dark
  const { colorMode } = useColorMode();

  // Clear
  const onClear = () => {
    setSomeLog('');
  };

  useEffect(() => {
    // When new messages arrive, add them to the logs
    const processLog = (newLogs: LogMessage[]) => {
      setSomeLog((prev) => {
        // splitting array of messages and formating
        const all = newLogs.reduce((p, l) => {
          if (l.tag === "homebase.http" && httpLogs)
            return (l.tag + ': ' + l.time + ' # ' + l.message + '\n' + p)
          else if (l.tag === "python.ai" && aiLogs)
            return (l.tag + ': ' + l.time + ' # ' + l.message + '\n' + p)
          else return p;
        }, "");
        // put new messages at the top
        return all + prev;
      });
    };

    socket.on('logs', processLog);
    return () => {
      socket.off('logs', processLog);
    }
  }, [socket, aiLogs, httpLogs]);

  useEffect(() => {
    onClear();
  }, [aiLogs, httpLogs])

  // Reference to the text area
  const aceEditorRef = React.useRef<AceEditor>(null);

  // Button action to enable AI logs
  const onChangeAILogs = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setAiLogs(event.target.checked);
  };
  // Button action to enable HTTP logs
  const onChangeHttpLogs = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setHttpLogs(event.target.checked);
  };

  return (
    <Drawer variant='alwaysOpen' placement="bottom" isOpen={isOpen} onClose={onClose}
      trapFocus={false} autoFocus={true}
    >
      <DrawerContent height={'25vh'} background={boardColor()} m={0} p={0}>
        <DrawerCloseButton p={0} m={0} />
        <DrawerBody>
          <HStack>
            <Text as="b">Notification Center</Text>
            <FormLabel htmlFor="ai" mb={1} >ai </FormLabel>
            <Switch id="ai" colorScheme="orange" defaultChecked={true} checked={aiLogs} onChange={onChangeAILogs} />
            <FormLabel htmlFor="http" mb={1} >http </FormLabel>
            <Switch id="http" colorScheme="teal" defaultChecked={true} checked={httpLogs} onChange={onChangeHttpLogs} />
            <Button m={0} p={0} colorScheme="teal" height={25} onClick={onClear}>clear</Button>
          </HStack>
          <AceEditor
            mode={'yaml'}
            theme={colorMode === 'light' ? "github" : "monokai"}
            name="ace-editor"
            value={someLog}
            readOnly={true}
            ref={aceEditorRef}
            focus={true}
            setOptions={{
              fontSize: 11, wrap: true, hasCssTransforms: true,
              enableBasicAutocompletion: false,
              enableLiveAutocompletion: false,
              enableSnippets: false,
              useWorker: false,
              showPrintMargin: false,
            }}
            height={'85%'}
            width={'100%'}
          />
        </DrawerBody>

      </DrawerContent>
    </Drawer >
  );
}

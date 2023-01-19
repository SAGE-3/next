/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useToast, HStack, Textarea, VStack, IconButton, useColorModeValue, Spinner, Box, Tooltip, Input, Button } from '@chakra-ui/react';
import { App } from '@sage3/applications/schema';
import { useAppStore, useUser } from '@sage3/frontend';
import { useState, ChangeEvent, ChangeEventHandler } from 'react';
import { MdPlayArrow, MdClearAll } from 'react-icons/md';
import { state as AppState } from '../index';
import { v4 as getUUID } from 'uuid';
type InputBoxProps = {
  app: App;
};

export const InputBox = (props: InputBoxProps): JSX.Element => {
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [code, setCode] = useState<string>(s.code);
  const { user } = useUser();
  const [fontSize, setFontSize] = useState(s.fontSize);
  const toast = useToast();

  const handleExecute = () => {
    console.log('handling execute and code is: ' + code);
    if (code) {
      console.log('Executing the code');
      updateState(props.app._id, {
        code: code,
        output: '',
        executeInfo: { executeFunc: 'execute', params: { _uuid: getUUID() } },
      });
    }
  };

  const handleClear = () => {
    console.log('Clear was pressed, current value for code is: ' + code);
    updateState(props.app._id, {
      code: '',
      output: '',
      executeInfo: { executeFunc: '', params: {} },
    });
    setCode('');
    console.log('New value aftere clearn is: ' + code);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => setCode(event.target.value);

  return (
    <Box>
      <HStack p="2">
        <Input placeholder="Basic usage" size="md" onChange={(ev) => handleChange(ev)} />
        <Button onClick={handleExecute}>Ask</Button>
      </HStack>
    </Box>
  );
};

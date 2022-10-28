/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Button, HStack, useColorModeValue, Tooltip, IconButton, VStack, Flex, ButtonGroup, Select, Badge } from '@chakra-ui/react';

import './components/styles.css';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';
// UUID generation
import { v4 as getUUID } from 'uuid';

import { MdDelete, MdPlayArrow, MdFileDownload, MdAdd, MdRemove, MdArrowDropDown } from 'react-icons/md';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/keybinding-vscode';

// SAGE3 imports
import { GetConfiguration, useAppStore, useUser } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';

// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';

// Rendering functions
import { ProcessedOutput } from './render';

/**
 * CodeCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
const AppComponent = (props: App): JSX.Element => {
  const s = props.data.state as AppState;

  return (
    <AppWindow app={props}>
      <>
        <Box w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')} overflowY={'scroll'}>
          <Box>{InputBox(props)}</Box>
          <Box w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
            <Box p={4} fontSize={s.fontSize + 'rem'} color={'GrayText'} overflowX={'hidden'}>
              {ProcessedOutput(s.output)}
            </Box>
          </Box>
        </Box>
      </>
    </AppWindow>
  );
};

/**
 *
 * @param props
 * @returns
 */
const InputBox = (props: App): JSX.Element => {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const ace = useRef<AceEditor>(null);
  const [code, setCode] = useState<string>(s.code);
  const { user } = useUser();
  const [fontSize, setFontSize] = useState(s.fontSize);

  const handleExecute = () => {
    const code = ace.current?.editor?.getValue();
    if (code) {
      updateState(props._id, {
        code: code,
        output: '',
        executeInfo: { executeFunc: 'execute', params: { uuid: getUUID() } },
      });
    }
  };

  const handleClear = () => {
    updateState(props._id, {
      code: '',
      output: '',
      executeInfo: { executeFunc: '', params: {} },
    });
    ace.current?.editor?.setValue('');
  };

  useEffect(() => {
    setCode(s.code);
  }, [s.code]);

  // Update from Ace Editor
  const updateCode = (c: string) => {
    setCode(c);
  };

  useEffect(() => {
    // update local state from global state
    setFontSize(s.fontSize);
  }, [s.fontSize]);

  return (
    <>
      <HStack>
        <AceEditor
          ref={ace}
          name="ace"
          value={code}
          onChange={updateCode}
          readOnly={user?._id !== props._createdBy}
          fontSize={fontSize + 'rem'}
          minLines={4}
          maxLines={20}
          placeholder="Enter code here"
          mode={s.language}
          theme={useColorModeValue('xcode', 'tomorrow_night_bright')}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            hasCssTransforms: true,
            showGutter: true,
            showPrintMargin: false,
            highlightActiveLine: true,
            showLineNumbers: true,
          }}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            marginTop: 15,
            marginLeft: 15,
            marginRight: 0,
            marginBottom: 10,
            padding: 0,
            overflow: 'hidden',
            backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
            boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
            borderRadius: '4px',
          }}
          commands={[
            { name: 'Execute', bindKey: { win: 'Shift-Enter', mac: 'Shift-Enter' }, exec: handleExecute },
            { name: 'Clear', bindKey: { win: 'Ctrl-Alt-Backspace', mac: 'Ctrl-Alt-Backspace' }, exec: handleClear },
          ]}
        />
        <VStack pr={2}>
          <Tooltip hasArrow label="Execute" placement="right-start">
            <IconButton
              _hover={{ bg: 'invisible', transform: 'scale(1.2)', transition: 'transform 0.2s' }}
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
              size={'xs'}
              rounded={'full'}
              onClick={handleExecute}
              aria-label={''}
              disabled={user?._id !== props._createdBy}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              icon={<MdPlayArrow size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
            />
          </Tooltip>
          <Tooltip hasArrow label="Clear All" placement="right-start">
            <IconButton
              _hover={{ bg: 'invisible', transform: 'scale(1.2)', transition: 'transform 0.2s' }}
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
              size={'xs'}
              rounded={'full'}
              onClick={handleClear}
              aria-label={''}
              disabled={user?._id !== props._createdBy}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              icon={<MdDelete size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
            />
          </Tooltip>
        </VStack>
      </HStack>
      <Flex pr={10} h={'24px'} fontSize={'16px'} color={'GrayText'} justifyContent={'right'}>
        Ln: {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().row + 1 : 1}, Col:{' '}
        {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().column + 1 : 1}
      </Flex>
    </>
  );
};

/**
 * UI toolbar for the cell
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  // List of kernel names
  const [kernels, setKernels] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string>();

  // Update from the props
  useEffect(() => {
    if (s.kernel) {
      setSelected(s.kernel);
      const name = kernels.find((k) => k.id === s.kernel)?.name || '-';
      update(props._id, { title: 'CodeCell> kernel ' + name });
    }
  }, [s.kernel, kernels]);

  // Runs the first time the component is loaded
  useEffect(() => {
    let refreshInterval: number;
    GetConfiguration().then((config) => {
      if (config) {
        // Jupyter URL
        let base: string;
        if (config.production) {
          base = `https://${window.location.hostname}:4443`;
        } else {
          base = `http://${window.location.hostname}`;
        }
        // refresh the list of kernels
        updateKernelList(base, config.token);
        // refresh list every minute
        refreshInterval = window.setInterval(updateKernelList, 5 * 1000, base, config.token);
      }
    });
    return () => {
      // Cancel interval timer on unmount
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const updateKernelList = (base: string, token: string) => {
    if (token && base) {
      fetch(base + '/api/sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token ' + token,
        },
      })
        .then((response) => {
          return response.json();
        })
        .then((sessions) => {
          setKernels(sessions.map((s: any) => ({ name: s.name, id: s.kernel.id })));
        });
    }
  };

  function selectKernel(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value) {
      console.log('Selected kernel>', e.target.value);
      // save local state
      setSelected(e.target.value);
      // updae the app
      updateState(props._id, { kernel: e.target.value });
    }
  }

  // Larger font size
  function handleIncreaseFont() {
    const fs = Math.min(s.fontSize * 1.2, 2);
    updateState(props._id, { fontSize: fs });
  }

  // Smaller font size
  function handleDecreaseFont() {
    const fs = Math.max(0.5, s.fontSize / 1.2);
    updateState(props._id, { fontSize: fs });
  }

  // Download the stickie as a text file
  const downloadPy = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const content = `${s.code}`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'codecell-' + dt + '.py';
    // Go for download
    downloadFile(txturl, filename);
  };

  return (
    <>
      <HStack>
        {selected && kernels.length > 0 ? (
          // show a green light if the kernel is running
          <Badge colorScheme="green" rounded="sm" size="lg">
            Online
          </Badge>
        ) : (
          // show a red light if the kernel is not running
          <Badge colorScheme="red" rounded="sm" size="lg">
            Offline
          </Badge>
        )}
        <Select
          placeholder="Select Kernel"
          rounded="lg"
          size="sm"
          width="150px"
          ml={2}
          px={0}
          colorScheme="teal"
          icon={<MdArrowDropDown />}
          onChange={selectKernel}
          variant={'outline'}
          value={selected ?? undefined}
        >
          {kernels.map((k) => (
            <option key={k.id} value={k.id}>
              {' '}
              {k.name}{' '}
            </option>
          ))}
        </Select>

        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
            <Button isDisabled={s.fontSize < 0.5} onClick={() => handleDecreaseFont()} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
              <MdRemove />
            </Button>
          </Tooltip>
          <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
            <Button isDisabled={s.fontSize >= 2} onClick={() => handleIncreaseFont()} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
              <MdAdd />
            </Button>
          </Tooltip>
        </ButtonGroup>
        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Download Code'} openDelay={400}>
            <Button onClick={downloadPy} _hover={{ opacity: 0.7 }}>
              <MdFileDownload />
            </Button>
          </Tooltip>
        </ButtonGroup>
      </HStack>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
